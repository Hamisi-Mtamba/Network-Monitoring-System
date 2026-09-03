// Import Angular dependency injection
import {
    Injectable
} from '@angular/core';

// Import HttpClient
import {
    HttpClient
} from '@angular/common/http';

// Import API builder
import {
    getCompanyPublicApiUrl
} from '../config/api.config';


@Injectable({
    providedIn: 'root'
})
export class SessionService {

    constructor(
        private readonly http: HttpClient
    ) {}


    // Get one customer's internet session
    getSession(
        companySlug: string,
        sessionId: number
    ) {

        return this.http.get<any>(
            `${getCompanyPublicApiUrl(companySlug)}/sessions/${sessionId}`
        );
    }
}