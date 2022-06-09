import * as passport from 'passport';

export const authenticatedRoute = passport.authenticate('jwt', { session: false });
