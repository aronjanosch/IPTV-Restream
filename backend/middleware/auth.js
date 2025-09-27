const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const User = require('../models/User');

// Configure Local Strategy
passport.use(new LocalStrategy(
  {
    usernameField: 'email',
    passwordField: 'password'
  },
  async (email, password, done) => {
    try {
      const user = await User.findByEmail(email);

      if (!user) {
        return done(null, false, { message: 'Invalid email or password' });
      }

      if (!user.password_hash) {
        return done(null, false, { message: 'Please use SSO to login' });
      }

      const isValid = await User.verifyPassword(password, user.password_hash);

      if (!isValid) {
        return done(null, false, { message: 'Invalid email or password' });
      }

      // Update last login
      await User.updateLastLogin(user.id);

      return done(null, {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      });
    } catch (error) {
      return done(error);
    }
  }
));

// Configure OIDC Strategy (if enabled)
if (process.env.OIDC_ENABLED === 'true') {
  const OIDCStrategy = require('passport-openidconnect').Strategy;

  passport.use('oidc', new OIDCStrategy({
    issuer: process.env.OIDC_ISSUER_URL,
    clientID: process.env.OIDC_CLIENT_ID,
    clientSecret: process.env.OIDC_CLIENT_SECRET,
    callbackURL: process.env.OIDC_CALLBACK_URL,
    scope: ['openid', 'email', 'profile']
  }, async (iss, sub, profile, accessToken, refreshToken, done) => {
    try {
      const email = profile.emails?.[0]?.value || profile._json?.email;
      const name = profile.displayName || profile._json?.name || profile._json?.preferred_username || email;

      if (!email) {
        return done(new Error('No email found in OIDC profile'));
      }

      // Try to find existing user by email first
      let user = await User.findByEmail(email);

      if (user) {
        // User exists, link SSO if not already linked
        if (!user.sso_provider) {
          await User.linkSSO(user.id, 'oidc', sub);
        }

        // Update last login
        await User.updateLastLogin(user.id);

        // Apply role mapping from OIDC groups if enabled
        let userRole = user.role;
        if (process.env.OIDC_ROLE_MAPPING === 'true' && profile._json?.groups) {
          const groups = profile._json.groups;
          if (groups.includes('streamhub-admins')) {
            userRole = 'admin';
          } else if (groups.includes('streamhub-users')) {
            userRole = 'user';
          }

          // Update role if it changed
          if (userRole !== user.role) {
            await User.updateRole(user.id, userRole);
          }
        }

        return done(null, {
          id: user.id,
          email: user.email,
          name: user.name,
          role: userRole
        });
      } else {
        // Auto-provision new user if enabled
        if (process.env.OIDC_AUTO_PROVISION === 'true') {
          let role = 'user';

          // Apply role mapping from OIDC groups
          if (process.env.OIDC_ROLE_MAPPING === 'true' && profile._json?.groups) {
            const groups = profile._json.groups;
            if (groups.includes('streamhub-admins')) {
              role = 'admin';
            }
          }

          const newUser = await User.create({
            email: email,
            name: name,
            role: role,
            ssoProvider: 'oidc',
            ssoId: sub
          });

          return done(null, {
            id: newUser.id,
            email: newUser.email,
            name: newUser.name,
            role: newUser.role
          });
        } else {
          return done(new Error('User not found and auto-provisioning is disabled'));
        }
      }
    } catch (error) {
      return done(error);
    }
  }));
}

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    if (user) {
      done(null, {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      });
    } else {
      done(null, false);
    }
  } catch (error) {
    done(error);
  }
});

module.exports = passport;