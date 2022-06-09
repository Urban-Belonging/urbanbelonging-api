import { UserGroup } from '../../models/UserGroup';
import { UserGroupInvitation } from '../../models/UserGroupInvitation';

type CustomEmailTemplateGenerator = (
  email: string,
  group: UserGroup,
  invitation: UserGroupInvitation
) => {
  subject: string;
  body: string;
};

export const customEmailTemplates: Record<string, CustomEmailTemplateGenerator> = {
  '623762bec7c9bd0022562436': (email, group, invitation) => {
    return {
      subject: `Sei invitato a partecipare al progetto ${group.name}`,
      body: `Il tuo codice di attivazione é ${invitation.activationCode} e scade il ${new Date(
        invitation.expiresAt
      ).toISOString()}<br/><br/>
      Prima di iniziare, ti preghiamo di rispondere a questo veloce questionario (richiede meno di 5 minuto): <a href="https://www.survey-xact.dk/LinkCollector?key=PH1MR8EWUN16" target="_blank" /><br/><br/>
      Grazie!
      `
    };
  }
};
