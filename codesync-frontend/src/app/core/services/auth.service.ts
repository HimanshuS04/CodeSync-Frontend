import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AuthResponse, LoginRequest,
  RegisterRequest, User
} from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private baseUrl = environment.apiGatewayUrl;
  private currentUserSubject =
    new BehaviorSubject<AuthResponse | null>(
      this.getStoredUser());

  currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  register(data: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(
      `${this.baseUrl}/api/auth/register`, data
    ).pipe(tap(res => this.storeUser(res)));
  }

  login(data: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(
      `${this.baseUrl}/api/auth/login`, data
    ).pipe(tap(res => this.storeUser(res)));
  }

  googleLogin(idToken: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(
      `${this.baseUrl}/api/auth/google`, { idToken }
    ).pipe(tap(res => this.storeUser(res)));
  }

  getProfile(): Observable<User> {
    const userId = this.getStoredUser()?.token;
    return this.http.post<User>(
      `${this.baseUrl}/api/auth/profile`,
      { userId: this.getUserId() });
  }

  updateProfile(data: any): Observable<User> {
    return this.http.put<User>(
      `${this.baseUrl}/api/auth/profile`,
      { ...data, userId: this.getUserId() });
  }

  logout(): void {
    localStorage.removeItem('codesync_user');
    this.currentUserSubject.next(null);
    this.router.navigate(['/auth/login']);
  }

  getToken(): string | null {
    return this.getStoredUser()?.token ?? null;
  }

  getUserId(): string | null {
    const token = this.getToken();
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload[
      'http://schemas.xmlsoap.org/ws/2005/05/' +
      'identity/claims/nameidentifier'
    ];
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  isAdmin(): boolean {
    return this.getStoredUser()?.role === 'ADMIN';
  }

  private storeUser(user: AuthResponse): void {
    localStorage.setItem(
      'codesync_user', JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  getStoredUser(): AuthResponse | null {
    const stored = localStorage.getItem('codesync_user');
    return stored ? JSON.parse(stored) : null;
  }
  searchUsers(query: string): Observable<any[]> {
    return this.http.post<any[]>(
      `${this.baseUrl}/api/auth/search`,
      { query });
  }
}