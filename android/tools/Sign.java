import com.android.apksig.ApkSigner;
import com.android.apksig.ApkVerifier;

import java.io.File;
import java.io.FileInputStream;
import java.security.KeyStore;
import java.security.PrivateKey;
import java.security.cert.X509Certificate;
import java.util.Collections;

/**
 * Signs an APK with the v2 (whole-file) scheme and checks the result the way a
 * phone will. The app needs Android 7.0 or later, which is where v2 arrived, so
 * the old v1 JAR signature is not needed — and this version of apksig builds it
 * through a JDK-internal API that current JDKs no longer have.
 *
 *   java -cp apksig.jar:. Sign keystore.p12 password alias in.apk out.apk
 */
public class Sign {
    public static void main(String[] a) throws Exception {
        char[] password = a[1].toCharArray();
        KeyStore store = KeyStore.getInstance("PKCS12");
        try (FileInputStream in = new FileInputStream(a[0])) { store.load(in, password); }
        PrivateKey key = (PrivateKey) store.getKey(a[2], password);
        X509Certificate cert = (X509Certificate) store.getCertificate(a[2]);
        ApkSigner.SignerConfig signer = new ApkSigner.SignerConfig.Builder("silo18", key, Collections.singletonList(cert)).build();
        new ApkSigner.Builder(Collections.singletonList(signer))
                .setInputApk(new File(a[3])).setOutputApk(new File(a[4]))
                .setMinSdkVersion(24).setV1SigningEnabled(false).setV2SigningEnabled(true)
                .build().sign();
        ApkVerifier.Result result = new ApkVerifier.Builder(new File(a[4])).build().verify();
        System.out.println("verified: " + result.isVerified() + "  v1: " + result.isVerifiedUsingV1Scheme() + "  v2: " + result.isVerifiedUsingV2Scheme());
        for (Object e : result.getErrors()) System.out.println("error: " + e);
        for (Object w : result.getWarnings()) System.out.println("warning: " + w);
        if (!result.isVerified()) System.exit(1);
    }
}
