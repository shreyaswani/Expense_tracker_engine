import { useState, useEffect } from 'react';
import { fetchCards, fetchTransactions } from '../api/client';

export function useDashboardData() {
  const [cards, setCards] = useState([]);
  const [activeCardId, setActiveCardId] = useState(null);
  const [transactions, setTransactions] = useState([]); // setTransactions is created here
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 1. Initial Load: Fetch all cards
  useEffect(() => {
    const loadCards = async () => {
      try {
        const response = await fetchCards();
        setCards(response.data);
        if (response.data.length > 0) {
          setActiveCardId(response.data[0].Card_ID);
        }
      } catch (err) {
        setError('Failed to load credit cards. Is the backend running?');
        console.error(err);
      }
    };
    loadCards();
  }, []);

  // 2. Dynamic Load: Fetch transactions whenever the active card changes
  useEffect(() => {
    if (!activeCardId) return;

    const loadTransactions = async () => {
      setLoading(true);
      try {
        const response = await fetchTransactions(activeCardId);
        setTransactions(response.data);
      } catch (err) {
        setError('Failed to load transactions.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    loadTransactions();
  }, [activeCardId]);

  return { 
    cards, 
    activeCardId, 
    setActiveCardId, 
    transactions, 
    setTransactions, 
    loading, 
    error 
  };
}