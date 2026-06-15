import { useState, useEffect } from 'react';
import { projectAPI } from '@/lib/api/projects';
import { Project, ProjectListResponse, ProjectFilters } from '@/types/projects';

export const useProjects = (filters: ProjectFilters = {}) => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pagination, setPagination] = useState<{
        count: number;
        next: string | null;
        previous: string | null;
    }>({
        count: 0,
        next: null,
        previous: null,
    });

    const fetchProjects = async (filters: ProjectFilters) => {
        try {
            setLoading(true);
            setError(null);
            const response = await projectAPI.list(filters);
            if (response.success && response.data) {
                // response.data is of type ProjectListResponse
                setProjects(response.data.results);
                setPagination({
                    count: response.data.count,
                    next: response.data.next,
                    previous: response.data.previous,
                });
            } else {
                setError(response.message || 'Failed to fetch projects');
                setProjects([]);
                setPagination({
                    count: 0,
                    next: null,
                    previous: null,
                });
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch projects');
            setProjects([]);
            setPagination({
                count: 0,
                next: null,
                previous: null,
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProjects(filters);
    }, [filters.search, filters.status, filters.sort_by, filters.limit, filters.offset]);

    return {
        projects,
        loading,
        error,
        pagination,
        refetch: () => fetchProjects(filters),
    };
};