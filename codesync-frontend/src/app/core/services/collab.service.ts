import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import * as signalR from '@microsoft/signalr';
import { AuthService } from './auth.service';

export interface CollabSession {
  sessionId: string;
  projectId: string;
  fileId: string;
  ownerId: string;
  status: string;
  maxParticipants: number;
  createdAt: string;
  participants: CollabParticipant[];
}

export interface CollabParticipant {
  userId: string;
  username: string;
  role: string;
  color: string;
}

export interface OTOperation {
  type: string;
  position: number;
  text: string;
  userId: string;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class CollabService {
  private baseUrl = environment.apiGatewayUrl;
  private hubConnection: signalR.HubConnection | null = null;

  // Callbacks
  onEditReceived: ((op: OTOperation) => void) | null = null;
  onCursorReceived: ((
    userId: string, username: string,
    line: number, col: number, color: string
  ) => void) | null = null;
  onUserJoined: ((
    userId: string, username: string
  ) => void) | null = null;
  onUserLeft: ((
    userId: string, username: string
  ) => void) | null = null;
  onInitialDocument: ((content: string) => void) | null = null;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  // REST API calls
  createSession(data: {
    projectId: string;
    fileId: string;
    ownerId: string;
    initialContent: string;
  }): Observable<CollabSession> {
    return this.http.post<CollabSession>(
      `${this.baseUrl}/api/sessions/create`, data);
  }

  joinSession(data: {
    sessionId: string;
    username: string;
  }): Observable<CollabSession> {
    return this.http.post<CollabSession>(
      `${this.baseUrl}/api/sessions/join`, data);
  }

  leaveSession(sessionId: string): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/api/sessions/leave`,
      { sessionId });
  }

  endSession(sessionId: string): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/api/sessions/end`,
      { sessionId });
  }

  getSession(sessionId: string): Observable<CollabSession> {
    return this.http.get<CollabSession>(
      `${this.baseUrl}/api/sessions/${sessionId}`);
  }

  getActiveSessions(projectId: string): Observable<CollabSession[]> {
    return this.http.get<CollabSession[]>(
      `${this.baseUrl}/api/sessions/project/${projectId}`);
  }

  // SignalR Connection
  async connectToHub(sessionId: string): Promise<void> {
    const token = this.authService.getToken();

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`http://localhost:5003/hubs/collab`, {
        accessTokenFactory: () => token || ''
      })
      .withAutomaticReconnect()
      .build();

    // Register handlers
    this.hubConnection.on('ReceiveEdit',
      (op: OTOperation) => {
        if (this.onEditReceived) this.onEditReceived(op);
      });

    this.hubConnection.on('ReceiveCursor',
      (userId: string, username: string,
       line: number, col: number, color: string) => {
        if (this.onCursorReceived)
          this.onCursorReceived(
            userId, username, line, col, color);
      });

    this.hubConnection.on('UserJoined',
      (userId: string, username: string) => {
        if (this.onUserJoined)
          this.onUserJoined(userId, username);
      });

    this.hubConnection.on('UserLeft',
      (userId: string, username: string) => {
        if (this.onUserLeft)
          this.onUserLeft(userId, username);
      });

    this.hubConnection.on('InitialDocument',
      (content: string) => {
        if (this.onInitialDocument)
          this.onInitialDocument(content);
      });

    await this.hubConnection.start();
    await this.hubConnection.invoke(
      'JoinSession', sessionId);
  }

  async sendEdit(
    sessionId: string, op: OTOperation
  ): Promise<void> {
    if (this.hubConnection) {
      await this.hubConnection.invoke(
        'SendEdit', sessionId, op);
    }
  }

  async sendCursor(
    sessionId: string,
    line: number, col: number,
    color: string
  ): Promise<void> {
    if (this.hubConnection) {
      await this.hubConnection.invoke(
        'SendCursor', sessionId, line, col, color);
    }
  }

  async leaveHub(sessionId: string): Promise<void> {
    if (this.hubConnection) {
      await this.hubConnection.invoke(
        'LeaveSession', sessionId);
      await this.hubConnection.stop();
      this.hubConnection = null;
    }
  }

  isConnected(): boolean {
    return this.hubConnection?.state
      === signalR.HubConnectionState.Connected;
  }
}