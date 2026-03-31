export const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(amount);
};

export const formatShortCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        notation: 'compact',
        maximumFractionDigits: 2,
    }).format(amount);
};

export const formatDate = (date: string | Date): string => {
    return new Intl.DateTimeFormat('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(new Date(date));
};

export const formatDateInput = (date: string | Date): string => {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
};

export const formatRelativeDate = (date: string | Date): string => {
    const now = new Date();
    const target = new Date(date);
    const diffMs = target.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays > 0 && diffDays <= 30) return `In ${diffDays} days`;
    if (diffDays < 0 && diffDays >= -30) return `${Math.abs(diffDays)} days ago`;
    return formatDate(date);
};

export const getStatusColor = (status: string): string => {
    const s = status.toLowerCase();
    const map: Record<string, string> = {
        active: 'badge-success',
        paid: 'badge-success',
        completed: 'badge-success',
        converted: 'badge-success',
        approved: 'badge-success',
        settled: 'badge-success',
        new: 'badge-info',
        pending: 'badge-warning',
        interested: 'badge-info',
        contacted: 'badge-info',
        filed: 'badge-info',
        partial: 'badge-warning',
        overdue: 'badge-danger',
        expired: 'badge-danger',
        cancelled: 'badge-danger',
        lost: 'badge-danger',
        rejected: 'badge-danger',
        missed: 'badge-danger',
    };
    return map[s] || 'badge-default';
};

export const daysUntil = (date: string | Date): number => {
    const now = new Date();
    const target = new Date(date);
    return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
};

export const truncate = (str: string, length: number = 40): string => {
    if (str.length <= length) return str;
    return str.slice(0, length) + '...';
};
