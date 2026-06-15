import { Suspense } from 'react';
import { CreatePasswordForm } from '@/components/shared/create-password-form'

const Page = () => {
  return (
    <div>
      <Suspense fallback={<div>Loading...</div>}>
        <CreatePasswordForm isAdminInvite={true} />
      </Suspense>
    </div>
  );
};

export default Page;
