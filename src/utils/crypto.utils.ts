const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const AES_KEY = '0BBd7ejE8LwzpsACBZP48M2IGQ96l3Yt';
const IV = 'l2hEBuiqM4oLyJE1';
const DEFAULT_AUTH_TAG_LENGTH = 16;

export type PasswordObjectType = {
    salt: string,
    hashedPassword: any
}

function hasAuthTag(algorithm) {
    return algorithm.endsWith('-gcm') || algorithm.endsWith('-ccm') || algorithm.endsWith('-ocb');
}
export abstract class CryptoUtils {

    public static decryptData(data, options) {
        var _a;
        var algorithm = options.algorithm, ivLength = options.ivLength, key = options.key;
        var authTagLength = (_a = options.authTagLength) !== null && _a !== void 0 ? _a : DEFAULT_AUTH_TAG_LENGTH;
        var iv = data.slice(0, ivLength);
        var decipher = crypto.createDecipheriv(algorithm, Buffer.from(key, 'hex'), iv);
        var dataToUse = data.slice(options.ivLength);
        if (hasAuthTag(options.algorithm)) {
            // Add ts-ignore due to build error TS2339: Property 'setAuthTag' does not exist on type 'Decipher'.
            // @ts-ignore
            decipher.setAuthTag(dataToUse.slice(0, authTagLength));
            dataToUse = dataToUse.slice(authTagLength);
        }
        var start = decipher.update(dataToUse);
        var final = decipher.final();
        return Buffer.concat([start, final]);
    }

    public static encryptData(data, options) {
        var algorithm = options.algorithm, authTagLength = options.authTagLength, ivLength = options.ivLength, key = options.key;
        var iv = options.iv
            ? Buffer.from(options.iv, 'hex')
            : crypto.randomBytes(ivLength);
        var cipherOptions = { authTagLength: authTagLength !== null && authTagLength !== void 0 ? authTagLength : DEFAULT_AUTH_TAG_LENGTH };
        var cipher = crypto.createCipheriv(algorithm, Buffer.from(key, 'hex'), iv, cipherOptions);
        var start = cipher.update(data);
        var final = cipher.final();
        if (hasAuthTag(options.algorithm)) {
            return Buffer.concat([iv, cipher.getAuthTag(), start, final]);
        }
        else {
            return Buffer.concat([iv, start, final]);
        }
    }

    public static encryptString(str: string, algo = ALGORITHM, key = AES_KEY, iv = IV) {
        let cipher = crypto.createCipheriv(algo, Buffer.from(key), iv);
        let encrypted = cipher.update(str);
        return Buffer.concat([
            encrypted,
            cipher.final()
        ]);
    }

    public static randomString(length, chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ') {
        var result = '';
        for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
        return result;
    }

    public static decryptString(str: string) {
        try {
            let encryptedStr = Buffer.from(str, 'base64');
            let decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(AES_KEY), IV);
            let decryptedStr = decipher.update(encryptedStr);
            return Buffer.concat([
                decryptedStr,
                decipher.final()
            ])
        } catch (err) {            
            return str;
        }
    }

    public static encodeObject(object: any) {
        Object.keys(object).forEach(key => {
            object[key] = CryptoUtils.encryptString(object[key]).toString('hex');
        })
        return object;
    }
    public static decodeObject(object: any) {
        Object.keys(object).forEach(key => {
            object[key] = CryptoUtils.decryptString(object[key]).toString();
        })
        return object;
    }

    static generateSalt() {
        return crypto.randomBytes(Math.ceil(14 / 2)).toString('hex').slice(0, 14);
    }
    public static hasher(password: string, salt: string): PasswordObjectType {
        let hash = crypto.createHmac('sha256', salt);
        hash.update(password);
        let value = hash.digest('hex');
        return {
            salt: salt,
            hashedPassword: value
        };
    }

    public static comparePasswords(persistedPasswordObject: PasswordObjectType, currentPassword: string) {
        let currentHashedPassword = CryptoUtils.hasher(currentPassword, persistedPasswordObject.salt)
        if (persistedPasswordObject.hashedPassword === currentHashedPassword.hashedPassword) {
            return true;
        } else {
            return false;
        }
    }
}
