import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, type OpenAPIObject, SwaggerModule } from '@nestjs/swagger';

// Generated from the controllers and the request and response classes (code-first). Also the
// source of the client's API types (npm run api:types in the root).
export const createOpenApiDocument = (app: INestApplication): OpenAPIObject => {
    const config = new DocumentBuilder()
        .setTitle('Food Planner API')
        .setDescription('Weekmenu en boodschappenlijsten plannen.')
        .setVersion('1.0')
        .addBearerAuth()
        .build();

    return SwaggerModule.createDocument(app, config, {
        // getCurrentUser instead of AuthController_getCurrentUser
        operationIdFactory: (_controllerKey, methodKey) => methodKey,
    });
};

export const setupSwagger = (app: INestApplication) => {
    SwaggerModule.setup('swagger', app, createOpenApiDocument(app), {
        swaggerOptions: { persistAuthorization: true },
    });
};
