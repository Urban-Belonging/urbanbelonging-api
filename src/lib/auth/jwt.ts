import * as Debug from 'debug';
import { sign, verify } from 'jsonwebtoken';
import * as passport from 'passport';
import { ExtractJwt, Strategy as JwtStrategy } from 'passport-jwt';
import { User, UserModel } from '../../models/User';
import { Redis } from '../redis';

const SIGNING_KEY = process.env.JWT_SIGNING_KEY as string;

const REFRESH_TOKEN_CACHE_PREFIX = 'auth-refresh-token:';

const debug = Debug('Auth');

passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: SIGNING_KEY
    },
    async function (jwtToken, done) {
      try {
        const authenticatedUser = await UserModel.findOne({ username: jwtToken.username });
        if (!authenticatedUser) return done(undefined, false);
        debug(`User with email ${jwtToken.username} authenticated successfully`);
        return done(undefined, authenticatedUser, jwtToken);
      } catch (err) {
        debug('Authentication error', err);
        return done(err, false);
      }
    }
  )
);

export const JWT = {
  async signToken(user: User) {
    const userAsJSON = user.toJSON();
    const accessToken = sign(userAsJSON, SIGNING_KEY, {
      expiresIn: '30s'
    });
    const refreshToken = sign(userAsJSON, SIGNING_KEY, {
      expiresIn: '30d'
    });

    // @todo implement TTL
    await Redis.set(`${REFRESH_TOKEN_CACHE_PREFIX}${refreshToken}`, user.id);

    return { accessToken, refreshToken };
  },
  async getUserIdFromCachedRefreshToken(refreshToken: string) {
    return Redis.get(`${REFRESH_TOKEN_CACHE_PREFIX}${refreshToken}`);
  },
  verifyToken(token: string) {
    const user = verify(token, SIGNING_KEY);
    return user;
  },
  async invalidateToken(refreshToken: string) {
    return Redis.delete(`${REFRESH_TOKEN_CACHE_PREFIX}${refreshToken}`);
  }
};
