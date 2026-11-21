import { defineMessages } from "../define-messages.ts";
import type { Messages } from "./en.ts";

export const idMessages: Messages = defineMessages({
  footer: {
    accessibilityLong: "Pernyataan Aksesibilitas",
    accessibilityShort: "Aksesibilitas",
    ariaLabel: "Tautan footer",
    contact: "Kontak",
    english: "English",
    indonesian: "Bahasa Indonesia",
    languageAriaLabel: "Pilih bahasa",
    permittedUseLong: "Untuk apa ini digunakan",
    permittedUseShort: "Tanda tangan elektronik",
    poweredBy: "Didukung oleh {productName}",
    privacyLong: "Kebijakan Privasi",
    privacyNotice: "Pemberitahuan privasi",
    privacyShort: "Privasi",
    termsLong: "Syarat Layanan",
    termsShort: "Syarat",
  },
  landing: {
    actions: {
      goToDashboard: "Buka dasbor",
      logIn: "Masuk",
      startFree: "Mulai gratis",
    },
    closing: {
      body: "Tanpa kartu kredit. Tanpa biaya per amplop. Cukup unggah dan kirim.",
      note: "Gratis • tidak perlu akun penandatangan • hingga 25 penandatangan per dokumen",
      title: "Kirim perjanjian berikutnya. Gratis dari kami.",
    },
    comparison: {
      feature: "Fitur",
      included: "Termasuk",
      notIncluded: "Tidak termasuk",
      perSeatPlans: "Paket per pengguna",
      rows: {
        envelopes: {
          feature: "Amplop per bulan",
          perSeat: "Tergantung paket",
          signudoc: "Tidak terbatas",
        },
        price: {
          feature: "Harga",
          perSeat: "Per pengguna, setiap bulan",
          signudoc: "Gratis selamanya",
        },
        reminders: {
          feature: "Pengingat",
          perSeat: "Hanya paket lebih tinggi",
        },
        signers: {
          feature: "Penandatangan per dokumen",
          perSeat: "Tergantung paket",
          signudoc: "Hingga 25 orang",
        },
      },
    },
    faq: {
      items: [
        {
          answer:
            "Tidak. Anda masuk untuk mengirim dokumen, tetapi penandatangan cukup mengklik tautan lalu menandatangani. Tanpa akun, tanpa ribet.",
          question: "Apakah penandatangan memerlukan akun Sakta?",
        },
        {
          answer:
            "Tanda tangan, inisial, tanggal, teks, dan kotak centang. Semua yang biasanya dibutuhkan dokumen.",
          question: "Jenis kolom apa saja yang bisa saya pasang pada dokumen?",
        },
        {
          answer:
            "Bisa. Klik tombol pengingat, lalu mereka akan mendapat notifikasi. Anda tidak perlu mengirim ulang seluruh dokumen.",
          question:
            "Bisakah saya mengingatkan penandatangan yang terlalu lama?",
        },
        {
          answer:
            "Anda mendapat PDF final yang telah ditandatangani serta sertifikat anti-perubahan. Unduh keduanya dengan satu klik.",
          question:
            "Apa yang saya dapatkan setelah semua orang selesai menandatangani?",
        },
      ],
      marker: "Pertanyaan umum",
      title: "Jawaban singkat.",
    },
    hero: {
      headline: "Tandatangani PDF Secara Online, Gratis.",
      headlineAccent: "Tanpa syarat tersembunyi.",
      lead: "Unggah PDF, tambahkan kolom tanda tangan, lalu kirim. Selesai.",
      marker: "Perangkat lunak tanda tangan elektronik gratis",
      seeHowItWorks: "Lihat cara kerjanya",
    },
    metadata: {
      description:
        "Perangkat lunak tanda tangan elektronik gratis untuk usaha kecil. Unggah, kirim, tanda tangani — tanpa kerumitan ala perusahaan besar.",
    },
    nav: {
      ariaLabel: "Navigasi publik",
    },
    pricing: {
      allPlans: "Lihat semua paket",
      lead: "Semua di bawah ini sudah termasuk. Selamanya. Gratis. Lihat perbandingannya dengan paket tanda tangan elektronik per pengguna pada umumnya.",
      marker: "Harga",
      signersNote: "Penandatangan Anda tidak perlu membuat akun.",
      title: "Gratis lebih unggul dari $120 setahun.",
    },
    security: {
      lead: "Setiap PDF dienkripsi, setiap tindakan dicatat, dan setiap tautan tanda tangan diamankan secara kriptografis. Kode sumbernya terbuka agar Anda dapat memverifikasinya sendiri.",
      marker: "Keamanan",
      pillars: [
        {
          body: "Dokumen disimpan di penyimpanan privat yang terenkripsi. Semua koneksi menggunakan HTTPS dengan penerapan HSTS.",
          title: "Dienkripsi saat tersimpan dan saat dikirim",
        },
        {
          body: "Setiap pembukaan, tanda tangan, dan penolakan dicatat dengan cap waktu dan alamat IP. Unduh PDF sertifikat sebagai bukti.",
          title: "Catatan audit lengkap",
        },
        {
          body: "Setiap penandatangan mendapat token kriptografis yang unik. Tautan kedaluwarsa sesuai batas waktu yang ditetapkan pengirim dan tidak dapat ditebak atau dipakai ulang.",
          title: "Tautan tanda tangan yang aman",
        },
        {
          body: "Seluruh kode sumbernya terbuka. Periksa model keamanannya, audit logikanya, atau pasang sendiri di infrastruktur Anda.",
          title: "Sumber terbuka",
        },
      ],
      title: "Dokumen Anda tetap aman.",
    },
    workflow: {
      lead: "Unggah PDF, tentukan urutan tanda tangan, pasang kolom, lalu kirim. Penandatangan Anda bahkan tidak perlu membuat akun.",
      marker: "Cara kerja",
      steps: [
        {
          body: "Gunakan kontrak yang sudah Anda susun. Tidak perlu membuat ulang dari templat.",
          title: "Unggah PDF Anda",
        },
        {
          body: "Tentukan siapa yang menandatangani pertama, kedua, dan seterusnya. Setiap orang diundang setelah sebelumnya selesai.",
          title: "Tambahkan penandatangan",
        },
        {
          body: "Letakkan kolom tanda tangan, inisial, tanggal, teks, dan kotak centang di halaman.",
          title: "Pasang kolom",
        },
        {
          body: "Kirim tautan tanda tangan. Ingatkan yang belum selesai. Unduh PDF finalnya.",
          title: "Kirim dan pantau",
        },
      ],
      title: "Empat langkah. Satu dokumen yang ditandatangani.",
    },
  },
  pricingPage: {
    bottom: {
      body: "Sakta berbasis open source dengan lisensi MIT. Pasang di infrastruktur Anda sendiri, atau minta kami menyiapkan hosting khusus.",
      cta: "Bicara dengan kami",
      title: "Butuh instalasi sendiri?",
    },
    cards: {
      business: {
        cta: "Hubungi kami",
        footnote: "Faktur dengan NPWP tersedia.",
        name: "Bisnis",
        tagline: "Untuk perusahaan yang perlu menghubungkan sistem.",
      },
      free: {
        cta: "Mulai gratis",
        footnote: "Tanpa kartu kredit. Tanpa batas waktu.",
        name: "Gratis",
        tagline: "Untuk mencoba seluruh alur tanda tangan.",
      },
      standard: {
        cta: "Mulai gratis",
        footnote: "Ditagih tahunan, bisa dibatalkan kapan saja.",
        name: "Standar",
        tagline: "Untuk tim kecil yang menandatangani tiap minggu.",
      },
    },
    comparison: {
      feature: "Fitur",
      lead: "Setiap paket bisa menandatangani PDF, mencatat persetujuan, dan menghasilkan segel dokumen. Paket lebih tinggi menambahkan alat yang dibutuhkan tim yang berkembang.",
      rows: [
        {
          business: "Tidak terbatas",
          free: "Tidak terbatas",
          label: "Dokumen per bulan",
          standard: "Tidak terbatas",
        },
        {
          business: "Hingga 25 orang",
          free: "Hingga 25 orang",
          label: "Penandatangan per dokumen",
          standard: "Hingga 25 orang",
        },
        {
          business: "Termasuk",
          free: "Termasuk",
          label: "Menandatangani tanpa akun",
          standard: "Termasuk",
        },
        {
          business: "Termasuk",
          free: "Termasuk",
          label: "Urutan tanda tangan dan penerima salinan",
          standard: "Termasuk",
        },
        {
          business: "Termasuk",
          free: "Termasuk",
          label: "Catatan audit, PDF tersegel, dan sertifikat",
          standard: "Termasuk",
        },
        {
          business: "Termasuk",
          free: "Termasuk",
          label: "Halaman Verify publik",
          standard: "Termasuk",
        },
        {
          business: "Termasuk",
          free: "Tidak termasuk",
          label: "Templat yang dapat dipakai ulang",
          standard: "Termasuk",
        },
        {
          business: "Termasuk",
          free: "Tidak termasuk",
          label: "Tenggat dan pengingat otomatis",
          standard: "Termasuk",
        },
        {
          business: "Termasuk",
          free: "Tidak termasuk",
          label: "Logo dan warna merek sendiri",
          standard: "Termasuk",
        },
        {
          business: "Termasuk",
          free: "Tidak termasuk",
          label: "Kode akses dan kode sekali pakai lewat email",
          standard: "Termasuk",
        },
        {
          business: "Termasuk",
          free: "Tidak termasuk",
          label: "Kirim massal dari CSV",
          standard: "Tidak termasuk",
        },
        {
          business: "Termasuk",
          free: "Tidak termasuk",
          label: "API, webhook, dan tanda tangan tersemat",
          standard: "Tidak termasuk",
        },
        {
          business: "Termasuk",
          free: "Tidak termasuk",
          label: "Masuk tunggal (OpenID Connect)",
          standard: "Tidak termasuk",
        },
        {
          business: "Email prioritas",
          free: "Isu GitHub",
          label: "Dukungan",
          standard: "Email",
        },
      ],
      title: "Bandingkan semua paket",
    },
    cycle: {
      annual: "Tahunan",
      free: "Gratis selamanya",
      label: "Periode penagihan",
      monthly: "Bulanan",
      perMonth: "per bulan",
      perUser: "per pengguna",
      perYear: "per tahun",
      save: "Hemat 2 bulan",
    },
    featured: "Paling populer",
    hero: {
      eyebrow: "Harga",
      lead: "Alur tanda tangan yang sama seperti platform besar, dengan harga jauh lebih terjangkau. Tanpa kuota dokumen dan tanpa biaya tersembunyi.",
      note: "Harga dalam rupiah. Paket tahunan sudah termasuk dua bulan gratis.",
      title: "Setiap tanda tangan, dengan harga yang masuk akal di sini.",
    },
    included: "Termasuk",
    metadata: {
      description:
        "Harga tanda tangan elektronik yang sederhana dan transparan untuk tim Indonesia. Mulai gratis, lalu bayi hanya untuk pengguna yang Anda butuhkan.",
      title: "Harga | Sakta",
    },
    notIncluded: "Tidak termasuk",
  },
  email: {
    legalFooter: {
      contact: "Kontak",
      privacyNotice: "Pemberitahuan privasi",
      privacyPolicy: "Kebijakan Privasi",
      questions: "Ada pertanyaan? Hubungi {supportAddress}.",
      sentBy: "Dikirim menggunakan {productName}.",
      sentByOrganization:
        "Dikirim oleh {organizationName} menggunakan {productName}.",
      terms: "Syarat Layanan",
    },
    completedSender: {
      body: '"{title}" telah ditandatangani secara lengkap di {productName}.',
      cta: "Tinjau amplop yang telah selesai",
      dashboard:
        "PDF final yang telah ditandatangani dan sertifikatnya sudah tersedia di dasbor Anda.",
      greeting: "Hai {senderName},",
      subject: '"{title}" telah ditandatangani secara lengkap',
    },
    completedSigner: {
      attached:
        "Dokumen yang telah selesai dan sertifikatnya terlampir. Simpanlah keduanya: itulah salinan perjanjian Anda.",
      body: '"{title}" dari {senderName} telah ditandatangani secara lengkap di {productName}.',
      certificate: "Sertifikat yang disunting: {url}",
      copyOnly: "{senderName} meminta Anda menerima salinan.",
      downloadCertificate: "Unduh sertifikat yang disunting",
      downloadSigned: "Unduh PDF yang telah ditandatangani",
      greeting: "Hai {signerName},",
      htmlLinksIntro:
        "Tautan unduhan tersedia selama {days} hari. Tautan yang kedaluwarsa menawarkan pengiriman yang baru.",
      linksIntro:
        "Tautan unduhan (tersedia selama {days} hari; tautan yang kedaluwarsa menawarkan pengiriman yang baru):",
      ready: "Dokumen yang telah selesai dan sertifikatnya sudah tersedia.",
      signedPdf: "PDF yang telah ditandatangani: {url}",
      subject: '"{title}" telah ditandatangani secara lengkap',
    },
    declinedSender: {
      body: '{signerName} ({signerEmail}) menolak "{title}" di {productName}.',
      cta: "Tinjau amplop",
      greeting: "Hai {senderName},",
      reason: "Alasan yang diberikan: {reason}",
      subject: '"{title}" ditolak oleh {signerName}',
    },
    downloadLinks: {
      certificate: "Sertifikat: {url}",
      ctaCertificate: "Unduh sertifikat",
      ctaSigned: "Unduh PDF yang telah ditandatangani",
      greeting: "Hai {signerName},",
      intro:
        'Berikut tautan unduhan baru untuk "{title}" di {productName}. Tautan ini berlaku selama {days} hari.',
      keep: "Unduh dan simpan berkasnya: itulah salinan catatan Anda.",
      signedPdf: "PDF yang telah ditandatangani: {url}",
      subject: 'Tautan unduhan baru untuk "{title}"',
    },
    reminder: {
      introAutomatic:
        '{senderName} masih menunggu tanda tangan Anda atas "{envelopeTitle}" yang dikirim melalui {productName}.',
      introManual:
        '{senderName} mengirimi Anda pengingat untuk menandatangani "{envelopeTitle}" melalui {productName}.',
      subjectAutomatic:
        'Pengingat: {senderName} masih menunggu tanda tangan Anda atas "{envelopeTitle}"',
      subjectManual:
        '{senderName} mengirimi Anda pengingat untuk menandatangani "{envelopeTitle}"',
    },
    signingInvitation: {
      cta: "Tinjau dan tanda tangani dokumen",
      deadline: "Permintaan ini kedaluwarsa pada {deadline}.",
      greeting: "Hai {signerName},",
      newestLink:
        "Jika Anda menerima tautan undangan atau pengingat yang lebih baru, gunakan tautan yang terbaru.",
      noAccount: "Anda tidak perlu akun {productName} untuk menandatangani.",
      sent: "{senderName} mengirimi Anda “{envelopeTitle}” melalui {productName}.",
      subject: "{senderName} meminta tanda tangan Anda atas “{envelopeTitle}”",
    },
    signingCode: {
      body: 'Kode Anda untuk membuka "{title}" di {productName} adalah:',
      greeting: "Hai {signerName},",
      subject: 'Kode Anda untuk "{title}"',
      validity:
        "Kode ini berlaku selama {minutes} menit. Jika Anda baru saja tidak membuka tautan tanda tangan, abaikan email ini.",
    },
    voidNotification: {
      body: '{senderName} membatalkan "{title}" di {productName}.',
      greeting: "Hai {signerName},",
      outcomeSigned:
        "Proses penandatanganan dibatalkan, sehingga dokumen yang Anda tandatangani tidak akan diselesaikan. Tidak ada tindakan lebih lanjut yang diperlukan.",
      outcomeUnsigned:
        "Proses penandatanganan dibatalkan. Tidak ada tindakan lebih lanjut yang diperlukan.",
      subject: '"{title}" dibatalkan oleh {senderName}',
    },
  },
  done: {
    closeTab: "Anda dapat menutup tab ini.",
    emailNotice:
      "Anda akan menerima email berisi dokumen yang telah ditandatangani setelah semua pihak menandatanganinya.",
    fallbackTitle: "dokumen ini",
    recorded: 'Tanda tangan Anda telah dicatat untuk "{title}".',
    title: "Semua sudah selesai.",
  },
  verify: {
    form: {
      choose: "Pilih PDF yang telah ditandatangani atau sertifikat audit",
      checkError: "File tidak dapat diperiksa saat ini.",
      checking: "Memeriksa {fileName}...",
      fileLabel: "PDF untuk diverifikasi",
      finishedAt: " pada {date} UTC",
      matchBody:
        "Amplop {status}{finishedAt} dengan {signerCount} {signers}. ID amplop {envelopeId}.",
      matchTitle:
        'File ini tidak berubah. Ini adalah {fileKind} yang dihasilkan situs ini untuk "{title}".',
      noMatchBody:
        "Situs ini tidak menghasilkan file yang persis sama. File ini mungkin telah diubah, disimpan ulang oleh program lain, atau berasal dari tempat lain. Mintalah salinan yang tersimpan di situs ini kepada pengirim.",
      noMatchTitle: "Tidak cocok.",
      privacy:
        "File tetap berada di perangkat Anda. Hanya sidik jari SHA-256-nya yang dikirim.",
      readError: "File tidak dapat dibaca.",
      signersMany: "penandatangan",
      signersOne: "penandatangan",
      statuses: {
        completed: "selesai",
        declined: "ditolak",
        voided: "dibatalkan",
      },
      types: {
        certificate: "sertifikat audit",
        signedDocument: "dokumen yang ditandatangani",
      },
    },
    metadata: {
      description:
        "Periksa bahwa PDF yang telah ditandatangani atau sertifikat audit benar-benar file yang dihasilkan situs ini.",
      title: "Verifikasi dokumen",
    },
    page: {
      description:
        "Periksa bahwa PDF yang telah ditandatangani atau sertifikat audit benar-benar file yang dihasilkan situs ini saat tanda tangan selesai. Perubahan sekecil apa pun pada file menghasilkan sidik jari yang berbeda.",
      sealBody:
        "Dokumen dan sertifikat yang selesai juga memiliki segel digital. Buka file di Adobe Acrobat Reader atau pembaca PDF lain dan lihat panel tanda tangannya. Pembaca tersebut memberi tahu apakah dokumen telah diubah sejak disegel. Kecuali organisasi telah memasang sertifikat dari otoritas sertifikat, pembaca juga akan menyatakan identitas penandatangan tidak diketahui; itu wajar dan tidak memengaruhi pemeriksaan perubahan.",
      sealHeading: "Memeriksa segel di pembaca PDF",
      title: "Verifikasi dokumen",
    },
  },
  signing: {
    live: {
      aria: {
        agreeToElectronicRecords:
          "Saya menyetujui penggunaan catatan dan tanda tangan elektronik",
        confirmSignatureMeaning: "Saya mengonfirmasi makna tanda tangan saya",
        documentPage: "Halaman dokumen",
        drawSignatureCanvas: "Kanvas gambar tanda tangan",
        nextPage: "Halaman berikutnya",
        previousPage: "Halaman sebelumnya",
        signaturePreview: "Pratinjau {kind}",
      },
      assignedFields: "Bidang yang ditugaskan",
      beforeYouSign: {
        description:
          '{senderName} mengirimi Anda "{envelopeTitle}" untuk ditandatangani secara elektronik.',
        title: "Sebelum Anda menandatangani",
      },
      completedAlt: "{signerName} menyelesaikan {kind}",
      currentSigner: "Penandatangan saat ini",
      decline: {
        cancel: "Batal",
        confirm: "Tolak penandatanganan",
        confirming: "Menolak...",
        description:
          "Pengirim ({senderName}) akan diberi tahu bahwa Anda menolak. Tindakan ini tidak dapat dibatalkan.",
        dialogTitle: "Tolak penandatanganan?",
        reasonLabel: "Alasan (opsional)",
        reasonPlaceholder:
          "Saya ingin mendiskusikan beberapa ketentuan terlebih dahulu...",
        toolbarButton: "Tolak",
      },
      declinedConfirmation: {
        description:
          "Penolakan Anda telah dicatat. Tidak ada tindakan lebih lanjut, dan tautan ini tidak lagi membuka dokumen.",
        title: "Anda menolak untuk menandatangani",
      },
      defaultConsentErrorMessage:
        "Persetujuan Anda tidak dapat disimpan saat ini.",
      defaultDeclineErrorMessage:
        "Kami tidak dapat mencatat penolakan Anda saat ini. Muat ulang halaman atau minta tautan tanda tangan baru dari pengirim.",
      defaultSubmitErrorMessage:
        "Kami tidak dapat menyelesaikan penandatanganan saat ini. Muat ulang halaman atau minta tautan tanda tangan baru dari pengirim.",
      document: {
        allRequiredComplete: "Semua bidang wajib telah diisi",
        fieldAnswerTooLong:
          "Jawaban ini terlalu panjang untuk muat di kolomnya pada dokumen. Persingkat menjadi {maxCharacters} karakter atau kurang.",
        invalidNumberNotice:
          "Bidang angka yang ditandai merah tidak berisi angka. {numberEntryMessage}",
        lockedValuesHelper:
          "Nilai dari penandatangan sebelumnya tetap terlihat tetapi terkunci. Hanya bidang yang ditugaskan kepada Anda yang dapat diubah.",
        numberEntryMessage: "Masukkan angka, misalnya 1250 atau 12.5.",
        readyToFinish: "Siap diselesaikan",
        remainingFieldsMany: "{count} bidang wajib tersisa",
        remainingFieldsOne: "{count} bidang wajib tersisa",
        textFieldTooLong:
          "Kolom teks di halaman {page} sudah penuh: persingkat jawaban Anda menjadi {count} karakter atau kurang agar seluruhnya muat di dokumen.",
      },
      downloadPdf: "Unduh PDF",
      field: {
        canvasLabels: {
          checkbox: "Kotak centang",
          date: "Tanggal",
          dropdown: "Pilih",
          fallback: "Bidang",
          initials: "Inisial",
          name: "Nama",
          number: "Angka",
          radio: "Opsi",
          signature: "Tanda tangan",
          text: "Teks",
        },
        completionValues: {
          checked: "Dicentang",
          chooseOne: "Pilih salah satu",
          enterANumber: "Masukkan angka",
          enterText: "Masukkan teks",
          notANumber: "Bukan angka",
          optional: "Opsional",
          tapToSign: "Ketuk untuk menandatangani",
        },
        inputLabels: {
          checkbox: "Kotak centang",
          date: "Tanggal",
          dropdown: "Pilih salah satu",
          fallback: "Bidang",
          initials: "Inisial di sini",
          name: "Nama",
          number: "Masukkan angka",
          radio: "Opsi",
          signature: "Tanda tangani di sini",
          text: "Masukkan teks",
        },
        noAnswer: "Tidak ada jawaban",
        signatureKinds: {
          initials: "inisial",
          signature: "tanda tangan",
        },
        summaryLabels: {
          checkbox: "Kotak centang",
          choice: "Pilihan",
          date: "Tanggal",
          dropdown: "Menu pilihan",
          fallback: "Bidang",
          initials: "Inisial",
          name: "Nama",
          number: "Angka",
          signature: "Tanda tangan",
          textInput: "Input teks",
        },
        unchecked: "Tidak dicentang",
      },
      fieldStatus: {
        complete: "Lengkap",
        fixThis: "Perbaiki",
        required: "Wajib",
      },
      finish: {
        agreeAndContinue: "Setuju dan lanjutkan",
        back: "Kembali",
        bindingNotice:
          "Dengan mengklik Selesai, Anda mengonfirmasi bahwa tanda tangan elektronik Anda dimaksudkan untuk mengikat secara hukum bagi dokumen ini.",
        button: "Selesai",
        confirmMeaningCheckbox:
          "Saya mengonfirmasi makna ini. Nama saya, tanggal dan waktu, serta makna ini akan dicetak bersama tanda tangan saya.",
        description: 'Anda menandatangani "{envelopeTitle}" dari {senderName}.',
        continueToProvider: "Lanjutkan ke {providerName}",
        finishing: "Menyelesaikan...",
        finishSigning: "Selesaikan penandatanganan",
        meaningHeading: "Makna tanda tangan Anda",
        preparing: "Menyiapkan...",
        providerBindingNotice:
          "Selanjutnya, {providerName} meminta Anda mengonfirmasi identitas dan menyetujui tanda tangan. Setelah selesai, Anda kembali ke sini. Dengan melanjutkan, Anda mengonfirmasi bahwa tanda tangan Anda dimaksudkan untuk mengikat secara hukum bagi dokumen ini.",
        providerSignatureIntro:
          "Dokumen ini meminta {signatureLevel}, yang dibuat dengan sertifikat atas nama Anda sendiri.",
        reauthEmailLabel: "Alamat email",
        reauthHelper:
          "Masukkan alamat email dan kata sandi akun Anda untuk menandatangani.",
        reauthPasswordLabel: "Kata sandi",
        signatureLevels: {
          advanced: "tanda tangan elektronik tingkat lanjut",
          qualified: "tanda tangan elektronik berkualifikasi",
        },
        summaryRowLabel: "{label} · Halaman {page}",
        title: "Selesaikan penandatanganan?",
      },
      fromSender: "Dari {senderName}",
      pageLabel: "Halaman {page} dari {total}",
      providerProblems: {
        cancelled:
          "Anda tidak menyelesaikan penandatanganan di {providerName}. Tidak ada yang ditandatangani, jadi Anda dapat mencoba lagi.",
        expired:
          "Sesi penandatanganan Anda sebelumnya berakhir sebelum selesai. Tidak ada yang ditandatangani, jadi Anda dapat mencoba lagi.",
        failed:
          "{providerName} tidak dapat menyelesaikan tanda tangan Anda. Tidak ada yang ditandatangani. Coba lagi, atau minta bantuan pengirim.",
        name: "Sertifikat yang Anda gunakan di {providerName} tidak sesuai dengan nama tempat dokumen ini dikirim. Tidak ada yang ditandatangani. Jika namanya salah, minta pengirim mengirim ulang dokumen dengan nama yang tertera pada sertifikat Anda.",
      },
      signatureModal: {
        addInitials: "Tambahkan inisial Anda",
        addSignature: "Tambahkan tanda tangan Anda",
        applyInitials: "Terapkan inisial",
        applySignature: "Terapkan tanda tangan",
        cancel: "Batal",
        canvasClearedMany: "Kanvas dihapus {count} kali",
        canvasClearedOne: "Kanvas dihapus {count} kali",
        clear: "Hapus",
        description:
          "Dengan menandatangani, Anda menyetujui bahwa tanda tangan elektronik ini setara secara hukum dengan tanda tangan manual Anda.",
        drawnInitials: "Inisial yang digambar",
        drawnSignature: "Tanda tangan yang digambar",
        drawTab: "Gambar",
        drawWithMouseOrFinger: "Gambar dengan mouse atau jari",
        renderedInStyle: "Ditampilkan dengan gaya tanda tangan",
        typeInitials: "Ketik inisial",
        typeSignature: "Ketik tanda tangan",
        typeTab: "Ketik",
        typeYourInitials: "Ketik inisial Anda",
        typeYourSignature: "Ketik tanda tangan Anda",
      },
      toolbar: {
        currentSignerView: "Tampilan penandatangan saat ini",
        noFieldsOnPage: "Tidak ada bidang di halaman ini",
        readyToFinish: "Siap diselesaikan",
        remainingMany: "{count} masih wajib",
        remainingOne: "{count} masih wajib",
        signedValuesVisible: "Nilai terkunci terlihat",
      },
    },
    states: {
      "already-signed": {
        description: "Anda sudah menyelesaikan tanda tangan untuk dokumen ini.",
        title: "Anda sudah menandatangani",
      },
      completed: {
        description:
          "Semua orang telah menandatangani dokumen ini. Tidak ada tindakan lebih lanjut.",
        title: "Amplop ini telah selesai",
      },
      declined: {
        description:
          "Seorang penandatangan menolak dokumen ini. Tidak ada tindakan lebih lanjut.",
        title: "Amplop ini ditolak",
      },
      embeddedExpiredDescription:
        "Minta aplikasi yang Anda gunakan untuk tautan tanda tangan baru.",
      error: {
        description:
          "Kami tidak dapat memuat dokumen ini saat ini. Muat ulang halaman atau minta tautan tanda tangan baru dari pengirim.",
        title: "Terjadi kesalahan. Silakan coba lagi.",
      },
      expired: {
        description: "Minta tautan tanda tangan baru dari pengirim.",
        title: "Tautan ini telah kedaluwarsa",
      },
      voided: {
        description:
          "Pengirim membatalkan dokumen ini. Tidak ada tindakan lebih lanjut.",
        title: "Amplop ini dibatalkan",
      },
    },
    verification: {
      checkError: "Kode tidak dapat diperiksa saat ini.",
      codeAlreadySent:
        "Kode sudah dikirim ke {maskedEmail} kurang dari satu menit yang lalu, jadi tidak ada email baru yang dikirim. Gunakan kode itu, atau kirim yang baru setelah hitung mundur pada tombol berakhir.",
      codeResendReady:
        "Kode telah dikirim ke {maskedEmail}. Jika belum sampai, Anda dapat mengirim yang baru sekarang.",
      codeSent: "Kode telah dikirim ke {maskedEmail}.",
      continue: "Lanjutkan",
      emailHelper: "Alamat tempat dokumen ini dikirim ({maskedEmail}).",
      emailLabel: "Alamat email",
      firstCode: "Kirimi saya kode",
      intro:
        "{senderName} meminta pemeriksaan sebelum Anda membuka “{envelopeTitle}”.",
      methods: {
        access_code: {
          helper:
            "Pengirim memberikan kode ini kepada Anda secara terpisah, misalnya melalui telepon.",
          label: "Kode akses",
        },
        account: {
          helper:
            "Dokumen ini ditandatangani dengan akun Anda sendiri di sini. Masukkan kata sandi yang Anda gunakan untuk masuk.",
          label: "Kata sandi",
        },
        email_code: {
          helper:
            "Kami mengirim kode 6 digit ke alamat tempat dokumen ini dikirim.",
          label: "Kode dari email Anda",
        },
      },
      newCodeSent: "Kode baru telah dikirim ke {maskedEmail}.",
      resendError: "Kode tidak dapat dikirim saat ini.",
      resendIn: "Kirim kode baru dalam {seconds} detik",
      resendNew: "Kirim kode baru",
      step: "Langkah {step} dari {total}.",
      title: "Konfirmasi bahwa ini Anda",
    },
  },
});
