import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AdminUser {
  userId: string;
  username: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export interface AdminProject {
  projectId: string;
  ownerId: string;
  name: string;
  description?: string;
  language: string;
  visibility: string;
  starCount: number;
  createdAt: string;
}

export interface ActiveSession {
  sessionId: string;
  projectId: string;
  fileId: string;
  ownerId: string;
  status: string;
  maxParticipants: number;
  createdAt: string;
  participants: any[];
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private baseUrl = environment.apiGatewayUrl;

  constructor(private http: HttpClient) {}

  // Users
  getAllUsers(): Observable<AdminUser[]> {
    return this.http.get<AdminUser[]>(
      `${this.baseUrl}/api/auth/admin/users`);
  }

  suspendUser(userId: string): Observable<any> {
    return this.http.put(
      `${this.baseUrl}/api/auth/admin/users/suspend`,
      {userId});
  }

  reactivateUser(userId: string): Observable<any> {
    return this.http.put(
      `${this.baseUrl}/api/auth/admin/users/reactivate`,
      {userId});
  }

  // Projects
  getAllProjects(): Observable<AdminProject[]> {
    return this.http.get<AdminProject[]>(
      `${this.baseUrl}/api/projects/admin/all`);
  }

  deleteProject(projectId: string): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/api/projects/admin/delete`,
      { projectId });
  }

  getProjectStats(): Observable<any> {
    return this.http.get(
      `${this.baseUrl}/api/projects/admin/stats`);
  }

  // Executions
  getExecutionStats(): Observable<any> {
    return this.http.get(
      `${this.baseUrl}/api/executions/admin/stats`);
  }

  // Sessions
  getActiveSessions(): Observable<ActiveSession[]> {
    return this.http.get<ActiveSession[]>(
      `${this.baseUrl}/api/sessions/admin/active`);
  }

  // Broadcast
  broadcast(title: string, message: string,
            recipientIds: string[]): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/api/notifications/admin/broadcast`,
      { title, message, recipientIds });
  }
}