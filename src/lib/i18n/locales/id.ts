import { defineMessages } from "../define-messages.ts";
import type { Messages } from "./en.ts";

export const idMessages: Messages = defineMessages({
  common: {
    lastUpdated: "Terakhir diperbarui {date}",
  },
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
  legal: {
    terms: {
      hero: {
        description:
          "Syarat ini mengatur akses dan penggunaan Anda atas Sakta, layanan tanda tangan elektronik untuk pelaku usaha di Indonesia. Syarat ini mencakup perjanjian komersial sehari-hari dan bukan nasihat hukum.",
        title: "Syarat Layanan",
      },
      metadata: {
        description:
          "Baca syarat penggunaan layanan tanda tangan elektronik Sakta di Indonesia.",
        title: "Syarat Layanan | Sakta",
      },
      sections: {
        acceptableUse: {
          heading: "6. Keamanan akun dan penggunaan yang pantas",
          paragraphs: [
            "Jaga kredensial Anda, batasi akses ke akun, dan segera beri tahu Sakta jika Anda menduga ada penggunaan tanpa izin. Jangan gunakan Sakta untuk melanggar hukum, melanggar hak pihak lain, menyebarkan perangkat lunak berbahaya, mengganggu penerima, mengambil data secara paksa, mengganggu layanan, atau melewati pengaturan akses dan batas laju.",
            "Jangan gunakan Sakta untuk menyamar sebagai orang lain, mendapatkan tanda tangan dengan cara menipu, atau mengirim surel massal yang tidak berkaitan dengan alur penandatanganan yang nyata.",
          ],
        },
        contact: {
          contactWithSupport:
            "Pertanyaan tentang Syarat ini dapat dikirim ke {supportAddress} atau melalui halaman {contactLink}.",
          heading: "14. Kontak",
        },
        disclaimers: {
          heading: "10. Penafian",
          paragraphs: [
            'Sakta disediakan "sebagaimana adanya" dan "sebagaimana tersedia" sejauh diizinkan hukum. Sakta tidak menjamin, baik tersurat maupun tersirat, termasuk kelayakan untuk diperdagangkan, kesesuaian untuk tujuan tertentu, hak milik, tidak pelanggaran, akurasi, ketersediaan tanpa gangguan, atau kecukupan hukum untuk transaksi tertentu.',
            "Sakta tidak menjamin bahwa suatu alur kerja akan diterima oleh pengadilan atau regulator, atau sesuai untuk dokumen yang diatur ketat atau dikecualikan. Mintalah nasihat hukum tentang keberlakuan, penyimpanan, keterangan konsumen, notarisasi, atau ketentuan setempat.",
          ],
        },
        electronicSignatures: {
          heading: "5. Tanda tangan dan catatan elektronik",
          paragraphs: [
            "Untuk dokumen dalam batas yang diizinkan, Sakta dirancang untuk membuat dan menyimpan tanda tangan serta catatan elektronik sesuai hukum Indonesia, termasuk UU Informasi dan Transaksi Elektronik (UU ITE) sebagaimana telah diubah dan PP Nomor 71 Tahun 2019. Setiap amplop menyimpan jejak audit dan salinan PDF yang tersegel.",
            "Sakta tidak menerbitkan sertifikat digital tersertifikasi dari penyedia layanan kepercayaan yang disetujui, dan tidak menjanjikan bahwa suatu alur kerja memenuhi setiap aturan sektoral tentang verifikasi identitas, sertifikat, atau notarisasi.",
          ],
        },
        eligibility: {
          heading: "2. Kelayakan dan kewenangan",
          paragraphs: [
            "Anda dapat menggunakan Sakta hanya jika Anda mampu membuat perjanjian yang mengikat menurut hukum Indonesia dan hanya untuk tujuan usaha yang sah. Anda bertanggung jawab memastikan setiap pengirim, penandatangan, dan penerima memiliki kewenangan bertindak atas nama pihak yang diwakilinya.",
            "Anda juga bertanggung jawab menentukan apakah transaksi Anda memerlukan saksi, notaris, bentuk tertentu, atau aturan penyimpanan yang tidak disediakan Sakta.",
          ],
        },
        governingLaw: {
          heading: "13. Hukum yang mengatur dan perubahan",
          paragraphs: [
            "Syarat ini diatur oleh hukum Republik Indonesia, tanpa memperhatikan aturan konflik hukum. Sengketa yang tidak dapat diselesaikan secara musyawarah diajukan ke pengadilan yang berwenang di Indonesia. Jika versi Bahasa Indonesia dan Inggris berbeda, versi Bahasa Indonesia yang berlaku.",
            "Sakta dapat memperbarui Syarat ini dengan memuat versi revisi di halaman ini. Pembaruan berlaku saat dimuat, kecuali tanggal lain dinyatakan kemudian.",
          ],
        },
        indemnification: {
          heading: "12. Ganti rugi",
          paragraphs: [
            "Anda akan membela dan membebaskan Sakta, afiliasinya, penyedia layanan, pemberi lisensi, dan stafnya dari tuntutan, kerugian, kerusakan, kewajiban, biaya, dan pengeluaran, termasuk biaya hukum yang wajar, yang timbul dari dokumen Anda, penggunaan layanan, pelanggaran Syarat ini, atau pelanggaran hukum atau hak pihak lain, kecuali hukum wajib menentukan lain.",
          ],
        },
        intellectualProperty: {
          heading: "8. Kekayaan intelektual dan konten Anda",
          paragraphs: [
            "Antara Anda dan Sakta, Anda tetap memiliki dokumen dan data yang Anda unggah, dengan tunduk pada hak yang dibutuhkan Sakta dan penyedianya untuk menghosting, memproses, mengirim, menampilkan, mengamankan, dan menyimpan konten tersebut guna menjalankan layanan.",
            "Sakta, merek, perangkat lunak, dan tampilannya dilindungi hukum kekayaan intelektual. Kecuali hukum mengizinkan, Anda tidak boleh menyalin, menjual kembali, merekayasa balik, atau membuat karya turunan dari layanan ini.",
          ],
        },
        liability: {
          heading: "11. Pembatasan tanggung jawab",
          paragraphs: [
            "Sejauh diizinkan hukum, Sakta, afiliasinya, penyedia, pemberi lisensi, dan stafnya tidak bertanggung jawab atas kerugian tidak langsung, insidental, khusus, konsekuensial, teladan, atau hukuman, maupun atas hilangnya keuntungan, pendapatan, reputasi, data, atau penggunaan yang timbul dari layanan atau Syarat ini.",
            "Sejauh diizinkan hukum, total tanggung jawab Sakta atas seluruh tuntutan yang timbul dari layanan atau Syarat ini tidak melebihi jumlah yang Anda bayarkan untuk layanan dalam 12 bulan sebelum peristiwa tersebut atau Rp1.000.000, mana yang lebih besar. Tidak ada ketentuan dalam Syarat ini yang meniadakan tanggung jawab yang tidak dapat ditiadakan berdasarkan UU Perlindungan Konsumen atau hukum wajib lainnya.",
          ],
        },
        overview: {
          heading: "1. Ringkasan",
          paragraphs: [
            "Dengan membuat akun, mengunggah dokumen, mengirim amplop, atau menandatangani melalui Sakta, Anda menyetujui Syarat ini. Jika Anda bertindak untuk perusahaan atau organisasi lain, Anda menyatakan berwenang mengikat organisasi tersebut pada Syarat ini.",
            "Sakta menyediakan perangkat lunak untuk menyiapkan, mengirim, menandatangani, dan menyimpan catatan elektronik. Sakta bukan firma hukum dan tidak memberikan nasihat hukum. Sakta tidak menentukan apakah suatu dokumen sah ditandatangani secara elektronik.",
            "Layanan ini ditujukan bagi pelaku usaha dan organisasi yang beroperasi di Indonesia serta perjanjian komersial mereka sehari-hari. Hukum Indonesia, termasuk UU Informasi dan Transaksi Elektronik (UU ITE) serta peraturan pelaksananya, mengatur tanda tangan dan catatan elektronik.",
          ],
        },
        permittedUse: {
          closing:
            "Jika dokumen masuk kategori yang diatur ketat, sensitif terhadap keselamatan, konsumen, warisan, pengadilan, atau hukum keluarga, jangan gunakan Sakta. Dengan mengirim amplop, Anda menegaskan bahwa dokumen tersebut merupakan perjanjian bisnis biasa dalam batas penggunaan yang diizinkan.",
          excluded: [
            "wasiat, warisan, dan trust testamenter;",
            "adopsi, perceraian, dan perkara hukum keluarga lainnya;",
            "penetapan dan perintah pengadilan, panggilan, gugatan, serta dokumen pengadilan resmi lainnya;",
            "pemberitahuan pembatalan atau penghentian layanan utilitas dasar seperti air, listrik, atau gas;",
            "pemberitahuan wanprestasi, percepatan penagihan, penarikan kembali, eksekusi jaminan, atau pengosongan tempat tinggal utama;",
            "pemberitahuan pembatalan manfaat asuransi kesehatan atau jiwa;",
            "pemberitahuan penarikan produk atau cacat serius yang dapat membahayakan kesehatan atau keselamatan;",
            "dokumen yang wajib menyertai pengangkutan atau penanganan bahan berbahaya, pestisida, atau barang berbahaya lainnya;",
            "keterangan konsumen yang diwajibkan undang-undang atau alur kerja lain yang memerlukan proses persetujuan elektronik tersendiri sebelum penyampaian.",
          ],
          excludedIntro:
            "Jangan gunakan Sakta untuk dokumen atau pemberitahuan yang menurut hukum memerlukan bentuk khusus, akta notaris, penyerahan fisik, atau proses persetujuan konsumen tersendiri, antara lain:",
          heading: "3. Penggunaan yang diizinkan dan dokumen yang dikecualikan",
          paragraphs: [
            "Sakta dipakai untuk perjanjian bisnis biasa dan catatan komersial sejenis, seperti NDA, rincian pekerjaan, perjanjian vendor dan layanan, serta persetujuan internal.",
          ],
        },
        sender: {
          heading: "4. Tanggung jawab pengirim",
          paragraphs: [
            "Pengirim bertanggung jawab atas konten yang diunggah, urutan penandatanganan, kolom yang dipasang, penerima yang diundang, dan kecukupan hukum dari proses tersebut. Anda harus memiliki hak yang dibutuhkan untuk mengunggah dokumen dan meminta tanda tangan.",
            "Pastikan data kontak penandatangan tetap akurat, hindari amplop yang menyesatkan, dan tangani pemberitahuan atau langkah luring yang diperlukan di luar Sakta.",
          ],
        },
        serviceChanges: {
          heading: "7. Perubahan layanan, ketersediaan, dan catatan",
          paragraphs: [
            "Sakta dapat mengubah, meningkatkan, menangguhkan, atau menghentikan fitur kapan saja. Kami dapat menambahkan batas ukuran dokumen, jumlah penandatangan, penyimpanan, atau retensi seiring perkembangan layanan, serta menghapus konten atau menangguhkan akun yang diduga melanggar Syarat ini atau menimbulkan risiko hukum, operasional, atau keamanan.",
            "Unduh dan simpan sendiri salinan dokumen yang telah selesai. Penyimpanan di Sakta bersifat kenyamanan dan mengikuti praktik retensi serta penghapusan dalam Kebijakan Privasi, termasuk kewajiban berdasarkan UU Perlindungan Data Pribadi (UU PDP Nomor 27 Tahun 2022).",
          ],
        },
        suspension: {
          closureWithSupport:
            "Permintaan penutupan akun dapat disampaikan melalui pengaturan atau dengan menulis ke {supportAddress}. Sebelum menutup akun, unduh dokumen yang ingin Anda simpan. Setelah penutupan, kami dapat menyediakan jangka waktu ekspor singkat, lalu menghapus berkas dokumen dan catatan amplop, kecuali informasi terbatas yang disimpan untuk keamanan, pencegahan penipuan, pemenuhan hukum, atau penyelesaian sengketa.",
          heading: "9. Penangguhan, penghentian, dan penutupan akun",
          paragraphs: [
            "Anda dapat berhenti menggunakan layanan kapan saja. Sakta dapat menangguhkan atau menghentikan akses jika kami beralasan meyakini Anda melanggar Syarat ini, menggunakan layanan di luar batas yang diizinkan, atau menimbulkan risiko keamanan, penipuan, atau hukum.",
          ],
        },
      },
    },
  },
});
