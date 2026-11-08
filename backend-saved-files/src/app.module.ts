import { fileURLToPath } from 'node:url';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller.js';
import { AuditoriaModule } from './auditoria/auditoria.module.js';
import { BitacoraSubscriber } from './auditoria/bitacora.subscriber.js';
import { AuthModule } from './auth/auth.module.js';
import { ClasificacionModule } from './clasificacion/clasificacion.module.js';
import { AuditableSubscriber } from './common/context/auditable.subscriber.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import { RequestContextInterceptor } from './common/interceptors/request-context.interceptor.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { DatabaseModule } from './database/database.module.js';
import { DisposicionModule } from './disposicion/disposicion.module.js';
import { ExpedientesModule } from './expedientes/expedientes.module.js';
import { PrestamosModule } from './prestamos/prestamos.module.js';
import { ReportesModule } from './reportes/reportes.module.js';
import { TransferenciasModule } from './transferencias/transferencias.module.js';
import { UbicacionesModule } from './ubicaciones/ubicaciones.module.js';
import { UnidadesModule } from './unidades/unidades.module.js';
import { UsuariosModule } from './usuarios/usuarios.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST', 'localhost'),
        port: Number(config.get('DB_PORT', 5432)),
        database: config.getOrThrow<string>('DB_NAME'),
        username: config.getOrThrow<string>('DB_USER'),
        password: config.getOrThrow<string>('DB_PASSWORD'),
        autoLoadEntities: true,
        subscribers: [AuditableSubscriber, BitacoraSubscriber],
        // Desarrollo: DB_SYNC=true crea tablas solas. Producción: DB_SYNC=false y se aplican las migraciones.
        synchronize: config.get('DB_SYNC') === 'true',
        migrationsRun: config.get('DB_SYNC') !== 'true',
        migrations: [fileURLToPath(new URL('./migrations/*.js', import.meta.url))],
      }),
    }),
    DatabaseModule,
    AuditoriaModule,
    UnidadesModule,
    UsuariosModule,
    AuthModule,
    ClasificacionModule,
    UbicacionesModule,
    ExpedientesModule,
    TransferenciasModule,
    PrestamosModule,
    DisposicionModule,
    ReportesModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [
    // Orden: autenticación JWT -> roles -> contexto de auditoría
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: RequestContextInterceptor },
  ],
})
export class AppModule {}
