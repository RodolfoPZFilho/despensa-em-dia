import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { criarItem } from '@/db/itens';
import { ItemForm } from '@/components/ItemForm';
import { useSync } from '@/sync/SyncContext';

export default function NovoItemScreen() {
  const db = useSQLiteContext();
  const { notificarAlteracao } = useSync();

  return (
    <ItemForm
      tituloBotao="Adicionar à despensa"
      onSalvar={async (dados) => {
        await criarItem(db, dados); // grava primeiro no SQLite (funciona offline)
        notificarAlteracao();       // agenda o envio ao Supabase
        router.back();
      }}
    />
  );
}
