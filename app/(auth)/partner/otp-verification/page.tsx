import { Suspense } from 'react';
import OTPForm from "@/components/shared/otp-form";

const Page = () => {
  return (
    <div>
      <Suspense fallback={<div>Loading...</div>}>
        <OTPForm isPartner={true} />
      </Suspense>
    </div>
  );
};

export default Page;