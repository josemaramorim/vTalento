const AutenticacaoService = require('../core/services/AutenticacaoService');
const db = require('../infra/db');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../infra/auth/token');

// Mock db calls
jest.mock('../infra/db', () => {
    const mockDb = jest.fn();
    mockDb.where = jest.fn().mockReturnThis();
    mockDb.first = jest.fn();
    return mockDb;
});

jest.mock('bcryptjs', () => ({
    compare: jest.fn()
}));

jest.mock('../infra/auth/token', () => ({
    generateToken: jest.fn()
}));

describe('AutenticacaoService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('deve realizar login com sucesso', async () => {
        const mockUser = {
            id: '123',
            empresa_id: '456',
            nome: 'Test',
            email: 'test@test.com',
            senha_hash: 'hash',
            perfil: 'CORRETOR'
        };

        const mockEmpresa = {
            id: '456',
            nome: 'Empresa Test',
            status: 'ATIVO',
            logo_url: 'logo.png',
            cor_primaria: '#000'
        };

        db.mockImplementation((table) => {
            if (table === 'GamUsuario') {
                return {
                    where: () => ({ first: () => Promise.resolve(mockUser) })
                };
            }
            if (table === 'GamEmpresa') {
                return {
                    where: () => ({ first: () => Promise.resolve(mockEmpresa) })
                };
            }
        });

        bcrypt.compare.mockResolvedValue(true);
        generateToken.mockReturnValue('mock_token');

        const result = await AutenticacaoService.login('test@test.com', '123456');

        expect(result).toHaveProperty('token', 'mock_token');
        expect(result.usuario).toHaveProperty('email', 'test@test.com');
        expect(result.empresa).toHaveProperty('nome', 'Empresa Test');
    });

    it('deve lançar erro se o usuário não for encontrado', async () => {
        db.mockImplementation(() => ({
            where: () => ({ first: () => Promise.resolve(null) })
        }));

        await expect(AutenticacaoService.login('test@test.com', '123456'))
            .rejects
            .toThrow('Credenciais inválidas');
    });

    it('deve lançar erro se a senha for inválida', async () => {
        const mockUser = { senha_hash: 'hash' };
        db.mockImplementation(() => ({
            where: () => ({ first: () => Promise.resolve(mockUser) })
        }));

        bcrypt.compare.mockResolvedValue(false);

        await expect(AutenticacaoService.login('test@test.com', 'wrong_password'))
            .rejects
            .toThrow('Credenciais inválidas');
    });

    it('deve lançar erro se a empresa não for ATIVO', async () => {
        const mockUser = { empresa_id: '456', senha_hash: 'hash' };
        const mockEmpresa = { status: 'SUSPENSO' };

        db.mockImplementation((table) => {
            if (table === 'GamUsuario') {
                return {
                    where: () => ({ first: () => Promise.resolve(mockUser) })
                };
            }
            if (table === 'GamEmpresa') {
                return {
                    where: () => ({ first: () => Promise.resolve(mockEmpresa) })
                };
            }
        });

        bcrypt.compare.mockResolvedValue(true);

        await expect(AutenticacaoService.login('test@test.com', '123456'))
            .rejects
            .toThrow('Empresa suspensa ou inativa');
    });
});
