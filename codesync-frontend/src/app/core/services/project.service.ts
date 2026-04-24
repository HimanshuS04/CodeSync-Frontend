import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Project {
  projectId: string;
  ownerId: string;
  name: string;
  description?: string;
  language: string;
  visibility: string;
  starCount: number;
  forkCount: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  language: string;
  visibility: string;
}

export interface UpdateProjectRequest {
  projectId: string;
  name?: string;
  description?: string;
  visibility?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private baseUrl = environment.apiGatewayUrl;

  constructor(private http: HttpClient) {}

  createProject(data: CreateProjectRequest): Observable<Project> {
    return this.http.post<Project>(
      `${this.baseUrl}/api/projects/create`, data);
  }

  getMyProjects(): Observable<Project[]> {
    return this.http.get<Project[]>(
      `${this.baseUrl}/api/projects/my`);
  }

  getPublicProjects(): Observable<Project[]> {
    return this.http.get<Project[]>(
      `${this.baseUrl}/api/projects/public`);
  }

  getProjectById(id: string): Observable<Project> {
    return this.http.get<Project>(
      `${this.baseUrl}/api/projects/${id}`);
  }

  searchProjects(query: string): Observable<Project[]> {
    return this.http.post<Project[]>(
      `${this.baseUrl}/api/projects/search`,
      { query });
  }

  updateProject(data: UpdateProjectRequest): Observable<Project> {
    return this.http.put<Project>(
      `${this.baseUrl}/api/projects/update`, data);
  }

  deleteProject(projectId: string): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/api/projects/delete`,
      { projectId });
  }
  addMember(projectId: string, userId: string): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/api/projects/members/add`,
      { projectId, userId });
  }

  removeMember(projectId: string, userId: string): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/api/projects/members/remove`,
      { projectId, userId });
  }
  starProject(projectId: string): Observable<{isStarred: boolean, message: string}> {
    return this.http.post<{isStarred: boolean, message: string}>(
      `${this.baseUrl}/api/projects/star`,
      { projectId });
  }

  getStarredIds(): Observable<string[]> {
    return this.http.get<string[]>(
      `${this.baseUrl}/api/projects/starred`);
  }
  checkAccess(projectId: string): Observable<{role: string}> {
    return this.http.post<{role: string}>(
      `${this.baseUrl}/api/projects/check-access`,
      { projectId });
  }
}