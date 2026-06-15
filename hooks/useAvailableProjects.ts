import { useState, useEffect } from 'react';
import { projectAPI } from '@/lib/api/projects';
import { Project, ProjectFilters } from '@/types/projects';

export const useAvailableProjects = (filters: ProjectFilters = {}) => {
    const [availableProjects, setAvailableProjects] = useState<Project[]>([]);
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

    const fetchAvailableProjects = async (filters: ProjectFilters) => {
        try {
            setLoading(true);
            setError(null);
            const response = await projectAPI.available(filters);
            
            if (response.success && response.data) {
                // response.data is of type ProjectListResponse
                setAvailableProjects(response.data.results);
                setPagination({
                    count: response.data.count,
                    next: response.data.next,
                    previous: response.data.previous,
                });
            } else {
                setError(response.message || 'Failed to fetch projects');
                setAvailableProjects([]);
                setPagination({
                    count: 0,
                    next: null,
                    previous: null,
                });
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch projects');
            setAvailableProjects([]);
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
        fetchAvailableProjects(filters);
    }, [filters.search, filters.status, filters.sort_by, filters.limit, filters.offset]);

    return {
        availableProjects,
        loading,
        error,
        pagination,
        refetch: () => fetchAvailableProjects(filters),
    };
};