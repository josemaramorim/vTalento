const request = require('supertest');
const app = require('../app');
const db = require('../infra/db');
const bcrypt = require('bcryptjs');

// Mock db and token generation to avoid real DB dependency in this unit
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
    generateToken: jest.fn().mockReturnValue('fake-jwt-token')
}));

describe('AutenticacaoController (Integração)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('POST /api/auth/login - deve retornar 200 e token com credenciais válidas', async () => {
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
                return { where: () => ({ first: () => Promise.resolve(mockUser) }) };
            }
            if (table === 'GamEmpresa') {
                return { where: () => ({ first: () => Promise.resolve(mockEmpresa) }) };
            }
        });

        bcrypt.compare.mockResolvedValue(true);

        const response = await request(app)
            .post('/api/auth/login')
            .send({ email: 'test@test.com', senha: 'password123' });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('token', 'fake-jwt-token');
        expect(response.body.usuario).toHaveProperty('email', 'test@test.com');
    });

    it('POST /api/auth/login - deve retornar 400 se faltar e-mail ou senha', async () => {
        const response = await request(app)
            .post('/api/auth/login')
            .send({ email: 'test@test.com' }); // Faltando senha

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'Email e senha são obrigatórios');
    });

    it('POST /api/auth/login - deve retornar 401 para credenciais inválidas', async () => {
        db.mockImplementation(() => ({
            where: () => ({ first: () => Promise.resolve(null) })
        }));

        const response = await request(app)
            .post('/api/auth/login')
            .send({ email: 'wrong@test.com', senha: 'wrong' });

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error', 'Credenciais inválidas');
    });
});
