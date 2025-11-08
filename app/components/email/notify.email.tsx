import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
  Tailwind
} from "@react-email/components";

interface GenericNotifyEmailProps {
  username: string;
  title: string;
  content: string;
  actions: Array<{
    text: string;
    url: string;
  }>;
}

export function GenericNotifyEmail({ username = "", title, content, actions = [] }: GenericNotifyEmailProps) {
  return (
    <Html>
      <Head>
        <style>
          {`
            @media (min-width: 640px) {
              .sm-px-6 { padding-left: 1.5rem; padding-right: 1.5rem; }
              .sm-px-12 { padding-left: 3rem; padding-right: 3rem; }
              .sm-py-16 { padding-top: 4rem; padding-bottom: 4rem; }
            }
            @media (min-width: 1024px) {
              .lg-px-8 { padding-left: 2rem; padding-right: 2rem; }
            }
            .button-shadow {
              box-shadow: 0 4px 6px rgba(0, 120, 125, 0.25), 0 10px 15px rgba(0, 120, 125, 0.1);
            }
            .button-shadow:hover {
              box-shadow: 0 6px 8px rgba(0, 120, 125, 0.3), 0 12px 18px rgba(0, 120, 125, 0.15);
            }
          `}
        </style>
      </Head>
      <Preview>{title}</Preview>
      <Tailwind>
        <Body className="bg-[#f0f4f8] font-sans">
          <Container className="mx-auto py-20">
            <Section className="w-full mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden">
              <Section className="bg-gradient-to-r from-[#00787d] to-[#005c61] p-10">
                <Img
                  src="https://rh.pharmacievaldoise.com/img/logo-rect-white.png"
                  width="220"
                  height="66"
                  alt="Val d&apos;Oise RH"
                  className="mx-auto"
                />
              </Section>
              
              <Section className="px-10 py-12 sm-px-12 sm-py-16 m-4">
                <Heading className="text-[#1a1a1a] text-3xl font-bold mb-8 text-center">
                  {title}
                </Heading>
                
                <Text className="text-[#4a5568] text-lg leading-relaxed mb-6">
                  Bonjour <span className="font-semibold text-[#00787d]">{username}</span>,
                </Text>
                
                <Text className="text-[#4a5568] text-lg leading-relaxed mb-8">
                  {content}
                </Text>
                
                {actions.map((action, index) => (
                  <Section key={index} className="text-center mb-6">
                    <Button
                      style={{ 
                        padding: "16px", 
                        backgroundColor: "#00787d",
                        borderRadius: "0.5rem",
                        color: "white",
                        fontSize: "1.25rem",
                        fontWeight: "bold",
                        textDecoration: "none",
                        display: "inline-block",
                        boxShadow: "0 4px 6px rgba(0, 120, 125, 0.25), 0 10px 15px rgba(0, 120, 125, 0.1)"
                      }}
                      href={action.url}
                    >
                      {action.text}
                    </Button>
                  </Section>
                ))}
                
                <Text className="text-[#4a5568] text-lg leading-relaxed mb-10">
                  Si vous avez des questions concernant cette notification, n&apos;hésitez pas à contacter notre équipe support.
                </Text>
                
                <Hr className="border-[#e2e8f0] my-8" />
                
                <Text className="text-[#a0aec0] text-base text-center">
                  Avis Clientèle Val d&apos;Oise - By Selys-Africa
                </Text>
              </Section>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

export default GenericNotifyEmail;