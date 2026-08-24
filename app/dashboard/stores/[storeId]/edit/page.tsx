import EditStorePage from "../page";

type EditStoreAliasPageProps = {
  params: Promise<{
    storeId: string;
  }>;
};

export default async function EditStoreAliasPage(props: EditStoreAliasPageProps) {
  return <EditStorePage {...props} />;
}
