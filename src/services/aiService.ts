import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, Settings, Goal, Bill } from "../types";
import { format, subDays, isAfter, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface AIInsight {
  title: string;
  message: string;
  type: 'success' | 'warning' | 'info';
  action?: string;
}

export async function getFinancialInsights(
  transactions: Transaction[],
  settings: Settings,
  goals: Goal[],
  bills: Bill[]
): Promise<AIInsight[]> {
  try {
    const recentTransactions = transactions
      .filter(t => !t.deleted && isAfter(parseISO(t.date), subDays(new Date(), 30)))
      .map(t => ({
        type: t.type,
        amount: t.amount,
        category: t.category,
        date: t.date,
        description: t.description
      }));

    const activeGoals = goals
      .filter(g => g.currentAmount < g.targetAmount)
      .map(g => ({
        title: g.title,
        target: g.targetAmount,
        current: g.currentAmount,
        deadline: g.deadline
      }));

    const pendingBills = bills
      .filter(b => !b.paid)
      .map(b => ({
        title: b.title,
        amount: b.amount,
        dueDate: b.dueDate
      }));

    const prompt = `
      Você é um assistente financeiro pessoal inteligente. Analise os dados financeiros abaixo e forneça 3 insights rápidos, acionáveis e motivadores em português brasileiro.
      
      Dados:
      - Renda Mensal: R$ ${settings.monthlyIncome}
      - Teto de Gastos: ${settings.spendingCapPercentage}% da renda (R$ ${(settings.monthlyIncome * settings.spendingCapPercentage) / 100})
      - Transações Recentes (últimos 30 dias): ${JSON.stringify(recentTransactions)}
      - Objetivos Ativos: ${JSON.stringify(activeGoals)}
      - Contas Pendentes: ${JSON.stringify(pendingBills)}
      
      Retorne um array JSON de objetos com:
      - title: Título curto (máx 30 caracteres)
      - message: Insight curto e direto (máx 100 caracteres)
      - type: 'success' (bom progresso), 'warning' (atenção necessária), ou 'info' (dica/sugestão)
      - action: (opcional) Uma ação curta recomendada
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              message: { type: Type.STRING },
              type: { type: Type.STRING, enum: ['success', 'warning', 'info'] },
              action: { type: Type.STRING }
            },
            required: ['title', 'message', 'type']
          }
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    
    return [];
  } catch (error) {
    console.error("Erro ao obter insights da IA:", error);
    return [
      {
        title: "Dica de Economia",
        message: "Tente reduzir gastos em categorias não essenciais este mês.",
        type: "info"
      }
    ];
  }
}

export async function categorizeTransaction(
  description: string,
  categories: { expense: string[], income: string[] }
): Promise<{ category: string, type: 'expense' | 'income' } | null> {
  try {
    const prompt = `
      Categorize a seguinte transação financeira: "${description}"
      
      Categorias de Saída: ${categories.expense.join(', ')}
      Categorias de Entrada: ${categories.income.join(', ')}
      
      Retorne um objeto JSON com:
      - category: A categoria mais adequada (deve ser uma das listas acima)
      - type: 'expense' se for saída, 'income' se for entrada
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING },
            type: { type: Type.STRING, enum: ['expense', 'income'] }
          },
          required: ['category', 'type']
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    return null;
  } catch (error) {
    console.error("Erro ao categorizar com IA:", error);
    return null;
  }
}

export async function suggestBudget(
  transactions: Transaction[],
  settings: Settings
): Promise<Record<string, number> | null> {
  try {
    const recentExpenses = transactions
      .filter(t => t.type === 'expense' && !t.deleted && !t.isTransfer)
      .reduce((acc: Record<string, number>, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {});

    const prompt = `
      Com base nos gastos recentes por categoria: ${JSON.stringify(recentExpenses)}
      E uma renda mensal de R$ ${settings.monthlyIncome}.
      
      Sugira um orçamento (limite de gastos) realista para cada categoria.
      O total dos limites deve ser aproximadamente ${settings.spendingCapPercentage}% da renda (R$ ${(settings.monthlyIncome * settings.spendingCapPercentage) / 100}).
      
      Retorne um objeto JSON onde as chaves são os nomes das categorias e os valores são os limites sugeridos em reais (números).
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    return null;
  } catch (error) {
    console.error("Erro ao sugerir orçamento com IA:", error);
    return null;
  }
}
