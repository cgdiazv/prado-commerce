/* eslint-disable @typescript-eslint/no-require-imports */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const typescript = require("typescript");

function createInvoiceHandler() {
  const customers = new Map();
  const orders = [];
  const createRequests = [];
  const key = (storeId, email) => `${storeId}:${email}`;
  const registeredCustomer = {
    id: "registered-id",
    email: "registered@example.com",
    taxExempt: true,
    creditDays: 45,
    storeId: "store-a",
  };
  customers.set(key(registeredCustomer.storeId, registeredCustomer.email), registeredCustomer);

  const tx = {
    customer: {
      async createMany(request) {
        createRequests.push(request);
        for (const customer of request.data) {
          const customerKey = key(customer.storeId, customer.email);
          if (!customers.has(customerKey)) {
            customers.set(customerKey, {
              ...customer,
              id: `walkin-${customer.storeId}`,
              taxExempt: false,
              creditDays: 30,
            });
          }
        }
      },
      async findUniqueOrThrow({ where }) {
        const customer = customers.get(key(where.storeId_email.storeId, where.storeId_email.email));
        if (!customer) throw new Error("Customer not found");
        return customer;
      },
    },
    productVariant: {
      async updateMany() { return { count: 1 }; },
    },
    order: {
      async create({ data }) {
        orders.push(data);
        return { id: `order-${orders.length}`, orderNumber: orders.length, total: data.total };
      },
    },
  };
  const prisma = {
    store: {
      async findUnique({ where }) {
        return { id: where.id, currency: "USD", posSettings: {}, taxSettings: {} };
      },
    },
    productVariant: {
      async findMany() {
        return [];
      },
    },
    customer: {
      async findFirst({ where }) {
        return [...customers.values()].find((customer) =>
          customer.id === where.id && customer.storeId === where.storeId,
        ) || null;
      },
    },
    async $transaction(callback) { return callback(tx); },
  };
  const dependencies = {
    "next/server": {
      NextResponse: {
        json(data, options = {}) {
          return { data, status: options.status ?? 200 };
        },
      },
    },
    "@/lib/prisma": { prisma },
    "@/lib/session": { getCurrentUserFromRequest: async () => ({ id: "merchant" }) },
    "@/lib/pos/settings": { resolvePosSettings: () => ({}) },
    "@/lib/pos/customer": { WALK_IN_EMAIL: "walkin@pos.local" },
    "@/lib/tax": {
      calculateTax: (_settings, _destination, lines, _shipping, exempt) => ({
        total: exempt ? 0 : 1,
        additionalTax: exempt ? 0 : 1,
        pricesIncludeTax: false,
        lineTaxes: lines.map(() => exempt ? 0 : 1),
      }),
    },
  };
  const filename = path.resolve(__dirname, "../app/api/invoices/route.ts");
  const source = fs.readFileSync(filename, "utf8");
  const compiled = typescript.transpileModule(source, {
    compilerOptions: { module: typescript.ModuleKind.CommonJS },
  }).outputText;
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  loaded.require = (name) => {
    if (Object.hasOwn(dependencies, name)) return dependencies[name];
    return module.require(name);
  };
  loaded._compile(compiled, filename);
  return { post: loaded.exports.POST, customers, orders, createRequests };
}

function request(body) {
  return { json: async () => ({ lines: [], ...body }) };
}

test("walk-in sales reuse a per-store profile, including concurrent sales", async () => {
  const { post, orders, createRequests } = createInvoiceHandler();
  const responses = await Promise.all([
    post(request({ storeId: "store-a", customerName: "Walk-in Customer" })),
    post(request({ storeId: "store-a", customerName: "Consumidor Final" })),
    post(request({ storeId: "store-b", customerName: "Walk-in Customer" })),
  ]);
  assert.deepEqual(responses.map((response) => response.status), [201, 201, 201]);
  assert.equal(orders[0].customerId, orders[1].customerId);
  assert.notEqual(orders[0].customerId, orders[2].customerId);
  assert.ok(orders.every((order) => order.customerEmail === "walkin@pos.local"));
  assert.ok(createRequests.every((entry) => entry.skipDuplicates === true));
});

test("selected customers retain their identity and tax exemption", async () => {
  const { post, orders, createRequests } = createInvoiceHandler();
  const response = await post(request({ storeId: "store-a", customerId: "registered-id" }));
  assert.equal(response.status, 201);
  assert.equal(orders[0].customerId, "registered-id");
  assert.equal(orders[0].customerEmail, "registered@example.com");
  assert.equal(orders[0].tax, 0);
  assert.equal(createRequests.length, 0);
});

test("an invalid selected customer cannot silently become a walk-in", async () => {
  const { post, orders, createRequests } = createInvoiceHandler();
  const response = await post(request({ storeId: "store-b", customerId: "registered-id" }));
  assert.equal(response.status, 400);
  assert.equal(orders.length, 0);
  assert.equal(createRequests.length, 0);
});
