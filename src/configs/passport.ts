import passport from 'passport';
import { Strategy as JWTStrategy, VerifiedCallback } from 'passport-jwt';
import { Request } from 'express';

import Auth from '../models/Auth';
import User from '../models/User';

passport.serializeUser<any, any>((user, done) => {
  done(undefined, user.id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const foundUser = await User.query().findById(id);
    done(undefined, foundUser);
  } catch (e) {
    done(e, undefined);
  }
});

passport.use(new JWTStrategy({
  jwtFromRequest: (req: Request) => {
    return req.signedCookies[process.env.ACCESS_TOKEN_NAME];
  },
  secretOrKey: process.env.ACCESS_TOKEN_SECRET,
  passReqToCallback: true,
}, async (req: Request, payload: any, done: VerifiedCallback) => {
  const foundAuth = await Auth.query().findOne({ username: payload.username });
  if (foundAuth) {
    const foundUser = foundAuth ? await User.query().findOne({ id: foundAuth.user_id }).where({ is_admin: true }) : null;
    const reqUser = {
      ...foundUser,
      username: foundAuth.username
    };
    req.user = reqUser;
  }
  done(null, foundAuth);
}));
