import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { ApiException } from '../src/common/api-error.js';
import { DishesController } from '../src/dishes/dishes.controller.js';
import { DishesService } from '../src/dishes/dishes.service.js';
import { type AuthServiceMock, createApp } from './create-app.js';

describe('Dishes (e2e)', () => {
    let app: NestExpressApplication;
    let accessToken: string;
    const dishId = '0162712c-016d-457c-9889-31c470b1d70e';
    const authService: AuthServiceMock = {
        login: vi.fn(),
        refresh: vi.fn(),
        logout: vi.fn(),
        validateUser: vi.fn(),
    };
    const dishesService = {
        getDishes: vi.fn(),
        getDish: vi.fn(),
        createDish: vi.fn(),
        updateDish: vi.fn(),
        deleteDish: vi.fn(),
    };

    beforeEach(async () => {
        vi.clearAllMocks();
        authService.validateUser.mockResolvedValue(true);
        ({ app, accessToken } = await createApp(authService, {
            controllers: [DishesController],
            providers: [{ provide: DishesService, useValue: dishesService }],
        }));
    });

    afterEach(async () => {
        await app.close();
    });

    const post = (body: object) =>
        request(app.getHttpServer())
            .post('/api')
            .set('Authorization', `Bearer ${accessToken}`)
            .send(body);

    it('requires an access token', async () => {
        await request(app.getHttpServer()).get('/api').expect(401);
        expect(dishesService.getDishes).not.toHaveBeenCalled();
    });

    it('trims the request and turns empty optional fields into null', async () => {
        dishesService.createDish.mockResolvedValue({ id: dishId });

        await post({
            name: '  Risotto met pompoen ',
            recipe: '   ',
            sourceUrl: '',
            ingredients: [{ name: ' Pompoen ', amount: 1, unit: ' stuk ' }, { name: 'Ui' }],
        }).expect(200);

        expect(dishesService.createDish).toHaveBeenCalledWith(
            expect.objectContaining({
                name: 'Risotto met pompoen',
                recipe: null,
                sourceUrl: null,
                ingredients: [
                    expect.objectContaining({ name: 'Pompoen', amount: 1, unit: 'stuk' }),
                    expect.objectContaining({ name: 'Ui' }),
                ],
            }),
        );
    });

    it('reports invalid ingredient lines with their path', async () => {
        const response = await post({
            name: 'Risotto',
            sourceUrl: 'not a url',
            ingredients: [{ name: '' }, { name: 'Ui', amount: -1 }],
        }).expect(400);

        expect(response.body.error.details.fields).toEqual([
            { field: 'sourceUrl', message: 'sourceUrl must be a URL address' },
            { field: 'ingredients.0.name', message: 'name should not be empty' },
            { field: 'ingredients.1.amount', message: 'amount must be a positive number' },
        ]);
        expect(dishesService.createDish).not.toHaveBeenCalled();
    });

    it('returns CONFLICT for a duplicate name', async () => {
        dishesService.createDish.mockRejectedValue(ApiException.conflict('Already exists'));

        const response = await post({ name: 'Risotto', ingredients: [] }).expect(409);

        expect(response.body.error.code).toBe('CONFLICT');
    });

    it('rejects an id that is not a UUID', async () => {
        await request(app.getHttpServer())
            .get('/api/not-a-uuid')
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(400);
        expect(dishesService.getDish).not.toHaveBeenCalled();
    });
});
