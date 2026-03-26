import prisma from '../../utils/prisma';

export class CompanyService {
    async create(data: { name: string; type?: string; category?: string }) {
        return prisma.company.create({ data });
    }

    async findAll(search?: string) {
        return prisma.company.findMany({
            where: search ? { name: { contains: search, mode: 'insensitive' } } : undefined,
            orderBy: { name: 'asc' },
        });
    }

    async findById(id: string) {
        const company = await prisma.company.findUnique({ where: { id } });
        if (!company) throw Object.assign(new Error('Company not found'), { statusCode: 404 });
        return company;
    }

    async update(id: string, data: { name?: string; type?: string; category?: string }) {
        await this.findById(id);
        return prisma.company.update({ where: { id }, data });
    }

    async delete(id: string) {
        await this.findById(id);
        return prisma.company.delete({ where: { id } });
    }
}

export const companyService = new CompanyService();
