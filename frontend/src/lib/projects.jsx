import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from './api';

const ProjectCtx = createContext(null);

export function ProjectProvider({ children }) {
  const [projects, setProjects] = useState([]);
  const [currentId, setCurrentId] = useState(() => localStorage.getItem('be_project') || null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get('/projects');
      setProjects(data);
      setCurrentId((cur) => {
        const next = cur && data.find((p) => p.id === cur) ? cur : data[0]?.id || null;
        if (next) localStorage.setItem('be_project', next);
        return next;
      });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, []); // eslint-disable-line

  const selectProject = (id) => {
    setCurrentId(id);
    localStorage.setItem('be_project', id);
  };

  const current = projects.find((p) => p.id === currentId) || null;
  return (
    <ProjectCtx.Provider value={{ projects, current, currentId, selectProject, refresh, loading }}>
      {children}
    </ProjectCtx.Provider>
  );
}

export const useProjects = () => useContext(ProjectCtx);
