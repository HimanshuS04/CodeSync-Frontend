import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface RunCodeRequest {
  projectId: string;
  fileId: string;
  language: string;
  sourceCode: string;
  stdin?: string;
}

export interface ExecutionResult {
  id: number;
  language: string;
  status: string;
  stdout?: string;
  stderr?: string;
  compileOutput?: string;
  executionTimeMs?: number;
  memoryUsedKb?: number;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class ExecutionService {
  private baseUrl = environment.apiGatewayUrl;

  constructor(private http: HttpClient) {}

  runCode(data: RunCodeRequest): Observable<ExecutionResult> {
    return this.http.post<ExecutionResult>(
      `${this.baseUrl}/api/executions/run`, data);
  }
  getByProject(projectId: string): Observable<ExecutionResult[]> {
    return this.http.get<ExecutionResult[]>(
      `${this.baseUrl}/api/executions/project/${projectId}`);
  }
}