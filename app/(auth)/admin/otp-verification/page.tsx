import { Suspense } from 'react';
import OTPForm from "@/components/shared/otp-form";

const Page = () => {
  return (
    <div>
      <Suspense fallback={<div>Loading...</div>}>
        <OTPForm />
      </Suspense>
    </div>
  );
};

export default Page;