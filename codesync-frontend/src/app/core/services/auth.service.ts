import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, LoginRequest, 
         RegisterRequest, User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private baseUrl = environment.authServiceUrl;
  private currentUserSubject = 
    new BehaviorSubject<AuthResponse | null>(this.getStoredUser());
  
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
    return this.http.get<User>(`${this.baseUrl}/api/auth/profile`);
  }

  updateProfile(data: any): Observable<User> {
    return this.http.put<User>(
      `${this.baseUrl}/api/auth/profile`, data);
  }

  changePassword(data: any): Observable<any> {
    return this.http.put(
      `${this.baseUrl}/api/auth/password`, data);
  }

  logout(): void {
    localStorage.removeItem('codesync_user');
    this.currentUserSubject.next(null);
    this.router.navigate(['/auth/login']);
  }

  getToken(): string | null {
    return this.getStoredUser()?.token ?? null;
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  isAdmin(): boolean {
    return this.getStoredUser()?.role === 'ADMIN';
  }

  private storeUser(user: AuthResponse): void {
    localStorage.setItem('codesync_user', JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  private getStoredUser(): AuthResponse | null {
    const stored = localStorage.getItem('codesync_user');
    return stored ? JSON.parse(stored) : null;
  }
}