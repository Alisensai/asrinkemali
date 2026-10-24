# Geri alma ve kapatma

Bu dal public archive içeriğini, PR #12 release gate'ini, PR #28 güvenlik kodunu veya deployment ayarlarını değiştirmez.

Geri alma:

1. PR henüz birleştirilmediyse taslağı kapatın; `integration/asrinkemali-v06-release-candidate` veya `main` üzerinde işlem yapmayın.
2. PR başka bir entegrasyonda kullanılmışsa bu feature commit'ini revert edin; history rewrite veya force push kullanmayın.
3. Yeni adapterları production provider'a bağlamayın; `REGISTERED_ADMIN_SESSION_PROVIDER` null ve `getCurrentAdminSession()` fail-closed kalmalıdır.
4. `SCHEMA-DRAFT.sql` offline taslaktır; çalıştırılmış migration yoktur ve geri alınacak DB değişikliği bulunmaz.
5. Test screenshot/raporları yalnız dokümantasyon varlığıdır; silmek uygulama durumunu etkilemez.

PR #26 kendi başına ayrı kalır; bu takip PR'sı kapatıldığında #26 dalını değiştirmek gerekmez.
