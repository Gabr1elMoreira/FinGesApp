import { apiRequest } from './api';

export interface MonthlyReport {
    id: string;
    month: number;
    year: number;
    verdict: 'EXCELLENT' | 'STABLE' | 'CRITICAL';
    summary: string;
    insights: string[];
    tip: string;
    createdAt: string;
}

export const getMonthlyReport = async (month?: number, year?: number, force?: boolean): Promise<MonthlyReport> => {
    const queryParams = new URLSearchParams();
    if (month) queryParams.append('month', month.toString());
    if (year) queryParams.append('year', year.toString());
    if (force) queryParams.append('force', 'true');
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return apiRequest(`/reports${query}`);
};
