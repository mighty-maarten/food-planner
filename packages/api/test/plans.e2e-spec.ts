import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { PlansController } from '../src/plans/plans.controller.js';
import { PlansService } from '../src/plans/plans.service.js';
import { type AuthServiceMock, createApp, testUser } from './create-app.js';

describe('Plans (e2e)', () => {
    let app: NestExpressApplication;
    let accessToken: string;
    const planId = 'f88f569a-5d45-4cf7-864a-e2e7cf7468e8';
    const dishId = '0162712c-016d-457c-9889-31c470b1d70e';
    const authService: AuthServiceMock = {
        login: vi.fn(),
        refresh: vi.fn(),
        logout: vi.fn(),
        validateUser: vi.fn(),
    };
    const plansService = {
        createPlan: vi.fn(),
        setDayDish: vi.fn(),
        setDayIngredients: vi.fn(),
        addItem: vi.fn(),
    };

    beforeEach(async () => {
        vi.clearAllMocks();
        authService.validateUser.mockResolvedValue(true);
        for (const fn of Object.values(plansService)) fn.mockResolvedValue({ id: planId });
        ({ app, accessToken } = await createApp(authService, {
            controllers: [PlansController],
            providers: [{ provide: PlansService, useValue: plansService }],
        }));
    });

    afterEach(async () => {
        await app.close();
    });

    const send = (method: 'post' | 'put', url: string, body: object) =>
        request(app.getHttpServer())
            [method](url)
            .set('Authorization', `Bearer ${accessToken}`)
            .send(body);

    it('creates a plan for the logged-in user', async () => {
        await send('post', '/api', { startDate: '2026-10-29', endDate: '2026-11-04' }).expect(200);

        expect(plansService.createPlan).toHaveBeenCalledWith(
            { startDate: '2026-10-29', endDate: '2026-11-04' },
            testUser.id,
        );
    });

    it('rejects dates that do not exist', async () => {
        const response = await send('post', '/api', {
            startDate: '2026-02-30',
            endDate: '2026-11-04',
        }).expect(400);

        expect(response.body.error.details.fields).toEqual([
            { field: 'startDate', message: 'startDate must be a date (YYYY-MM-DD)' },
        ]);
    });

    it('validates the date in the path', async () => {
        await send('put', `/api/${planId}/days/29-10-2026`, { dishId }).expect(400);
        expect(plansService.setDayDish).not.toHaveBeenCalled();
    });

    it('accepts null to clear the dish of a day', async () => {
        await send('put', `/api/${planId}/days/2026-10-30`, { dishId: null }).expect(200);
        expect(plansService.setDayDish).toHaveBeenCalledWith(planId, '2026-10-30', null);
    });

    it('requires the dish id to be a UUID or null', async () => {
        await send('put', `/api/${planId}/days/2026-10-30`, { dishId: 'risotto' }).expect(400);
        await send('put', `/api/${planId}/days/2026-10-30`, {}).expect(400);
        expect(plansService.setDayDish).not.toHaveBeenCalled();
    });

    it('picks ingredients as the logged-in user', async () => {
        await send('put', `/api/${planId}/days/2026-10-30/ingredients`, {
            ingredientIds: [dishId],
        }).expect(200);

        expect(plansService.setDayIngredients).toHaveBeenCalledWith(
            planId,
            '2026-10-30',
            [dishId],
            testUser.id,
        );
    });

    it('trims a free item and drops an empty note', async () => {
        await send('post', `/api/${planId}/items`, { name: ' Brood ', note: ' ' }).expect(200);

        expect(plansService.addItem).toHaveBeenCalledWith(
            planId,
            expect.objectContaining({ name: 'Brood', note: null }),
            testUser.id,
        );
    });
});
