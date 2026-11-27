'use client';
import type {ReactNode} from 'react';
import {useNotifications} from '../notifications/NotificationProvider';
export function useToast(){return useNotifications();}
export default function ToastProvider({children}:{children:ReactNode}){return <>{children}</>;}
