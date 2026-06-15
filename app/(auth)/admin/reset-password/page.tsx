import React, { Suspense } from 'react';
import { ResetPasswordForm } from '@/components/shared/reset-password-form';

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <div><ResetPasswordForm /></div>
        </Suspense>
    );
}