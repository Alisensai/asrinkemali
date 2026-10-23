import styles from "@/app/yonetim/admin.module.css";

export function AdminAccessClosed() {
  return (
    <main className={styles.accessPage} data-admin-route>
      <div className={styles.accessCard}>
        <p className={styles.kicker}>GÜVENLİ ERİŞİM</p>
        <h1>Yönetim paneli erişime kapalı</h1>
        <p>
          Bu projede henüz güvenilir bir sunucu tarafı kimlik sağlayıcısı yapılandırılmadı.
          Oturum açma, kullanıcı rolü veya onay işlemi üretim ortamında etkin değildir.
        </p>
        <p>
          Test kullanıcıları yalnızca testlerin içine enjekte edilir. Ortam değişkenleri,
          tarayıcı depolaması ve formdaki adlar kimlik veya insan onayı kanıtı olarak kabul edilmez.
        </p>
      </div>
    </main>
  );
}
