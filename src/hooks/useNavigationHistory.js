import { useRef, useCallback } from 'react';

const mainTabs = ['home', 'credit', 'transact', 'investments', 'more', 'welcome', 'auth'];

const useNavigationHistory = (currentPage, setCurrentPage) => {
  const history = useRef([]);
  const lastPage = useRef(currentPage);

  const navigateTo = useCallback((page) => {
    if (page === lastPage.current) return;
    
    if (!mainTabs.includes(page)) {
      history.current.push(lastPage.current);
      if (history.current.length > 20) {
        history.current = history.current.slice(-20);
      }
    } else {
      history.current = [];
    }
    
    lastPage.current = page;
    setCurrentPage(page);
  }, [setCurrentPage]);

  const goBack = useCallback(() => {
    if (history.current.length > 0) {
      const previousPage = history.current.pop();
      lastPage.current = previousPage;
      setCurrentPage(previousPage);
      return true;
    }
    
    if (!mainTabs.includes(lastPage.current)) {
      lastPage.current = 'home';
      setCurrentPage('home');
      return true;
    }
    
    return false;
  }, [setCurrentPage]);

  const canGoBack = useCallback(() => {
    return history.current.length > 0 || !mainTabs.includes(lastPage.current);
  }, []);

  const clearHistory = useCallback(() => {
    history.current = [];
  }, []);

  return {
    navigateTo,
    goBack,
    canGoBack,
    clearHistory,
    historyLength: history.current.length,
  };
};

export default useNavigationHistory;
