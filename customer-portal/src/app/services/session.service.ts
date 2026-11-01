import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';
import { getCompanyPublicApiUrl } from '../config/api.config';
import { SessionApiResponse } from '../models/session.model';
@Injectable({providedIn:'root'})
export class SessionService {
    constructor(private readonly http:HttpClient){}
    getSession(slug:string,id:number){return this.http.get<SessionApiResponse>(`${getCompanyPublicApiUrl(slug)}/sessions/${id}`).pipe(map(response=>
        'session' in response?response.session:'data' in response?response.data:response));}
}
