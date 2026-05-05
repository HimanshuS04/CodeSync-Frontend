import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AppNotification {
  id: number;
  recipientId: string;
  actorId: string;
  type: string;
  title: string;
  message: string;
  relatedId: string;
  relatedType: string;
  isRead: boolean;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private baseUrl = environment.apiGatewayUrl;

  constructor(private http: HttpClient) {}

  getMyNotifications(): Observable<AppNotification[]> {
    return this.http.get<AppNotification[]>(
      `${this.baseUrl}/api/notifications/me`);
  }

  getUnreadCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(
      `${this.baseUrl}/api/notifications/unread-count`);
  }

  markRead(notificationId: number): Observable<any> {
    return this.http.put(
      `${this.baseUrl}/api/notifications/read`,
      { notificationId });
  }

  markAllRead(): Observable<any> {
    return this.http.put(
      `${this.baseUrl}/api/notifications/read-all`,
      {});
  }
}