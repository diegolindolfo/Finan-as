import Papa from 'papaparse';
import { Transaction } from '../types';
import { format, parseISO } from 'date-fns';

export const exportTransactionsToCSV = (transactions: Transaction[]) => {
  const data = transactions.map(tx => ({
    Data: format(parseISO(tx.date), 'dd/MM/yyyy HH:mm'),
    Descrição: tx.description,
    Categoria: tx.category,
    Tipo: tx.type === 'income' ? 'Receita' : 'Despesa',
    Valor: tx.amount.toFixed(2).replace('.', ','),
  }));

  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `transacoes_${format(new Date(), 'yyyy-MM-dd')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
