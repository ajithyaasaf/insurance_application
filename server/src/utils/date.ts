import { PolicyStatus } from '@prisma/client';

export const getStartOfTodayIST = (): Date => {
    const now = new Date();
    // Use Intl API to extract IST year, month, day securely across OS timezones
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).formatToParts(now);
    
    // formatToParts gives us an array of {type, value}
    const year = parts.find(p => p.type === 'year')?.value;
    const month = parts.find(p => p.type === 'month')?.value;
    const day = parts.find(p => p.type === 'day')?.value;

    // By appending +05:30 to T00:00:00, vanilla JS securely parses exactly the UTC equivalent of midnight in IST
    return new Date(`${year}-${month}-${day}T00:00:00.000+05:30`);
};

export const buildStatusFilter = (status: string) => {
    const todayIST = getStartOfTodayIST();
    if (status === 'active') {
        return { status: 'active' as PolicyStatus, expiryDate: { gte: todayIST } };
    } else if (status === 'expired') {
        return {
            OR: [
                { status: 'expired' as PolicyStatus },
                { status: 'active' as PolicyStatus, expiryDate: { lt: todayIST } }
            ]
        };
    }
    return { status: status as PolicyStatus };
};

export const mapPolicyStatus = <T extends { status: string, expiryDate?: Date | null }>(policy: T): T => {
    if (!policy) return policy;
    const todayIST = getStartOfTodayIST();
    // If a database record says active, but it has physically expired, forcefully mutate its status locally so it is secure.
    if (policy.status === 'active' && policy.expiryDate && policy.expiryDate < todayIST) {
        return { ...policy, status: 'expired' };
    }
    return policy;
};

export const mapPaymentStatus = <T extends { status: string, dueDate: Date }>(payment: T): T & { isOverdue: boolean } => {
    if (!payment) return payment as any;
    const todayIST = getStartOfTodayIST();
    // A payment is overdue if it's not 'paid' and the due date has passed.
    const isOverdue = payment.status !== 'paid' && payment.dueDate < todayIST;
    return { ...payment, isOverdue };
};
