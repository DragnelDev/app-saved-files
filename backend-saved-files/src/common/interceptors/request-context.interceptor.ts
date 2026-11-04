import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { requestContext } from '../context/request-context.js';

@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<{ user?: { id: string } }>();
    return new Observable((subscriber) =>
      requestContext.run({ userId: req.user?.id }, () => {
        next.handle().subscribe(subscriber);
      }),
    );
  }
}
