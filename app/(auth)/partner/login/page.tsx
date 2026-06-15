import { LoginForm } from "@/components/shared/login-form";

const Page = () => {
  return (
    <div>
      <LoginForm
            cardTitle="Partner login"
            cardDescription="Don’t have a partner account yet?"
            isPartner={true}
          />
    </div>
  );
};

export default Page;
