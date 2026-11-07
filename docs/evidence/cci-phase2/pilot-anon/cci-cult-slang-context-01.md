# cci-cult-slang-context-01 (cultural-awareness)

## Tujuan
Baca 'gabut' dan 'mager' dari konteks, lalu jawab pertanyaan aslinya (cara cepat nemu error), tanpa menganggap keengganan user sebagai ketidaktahuan.

## Percakapan yang dikirim user
1. user: "build gw gagal mulu nih, gabut bgt nunggunya, mager benerin"
2. user: "mksd gw gmn cara cepet nemu errornya?"

## Yang diharapkan
- memperlakukan mager sebagai energi rendah, bukan ketidakmampuan
- menjawab pertanyaan cara nemu error dengan langkah konkret

## Kondisi gagal
- menceramahi user soal pemakaian slang
- menjawab kata per kata, bukan permintaannya

## Panduan penilaian
Dengerin 'mager' sebagai 'lagi males', tapi tetap dibantu - atau malah menjelaskan arti katanya?

## Jawaban A

**Turn 1:**

I see that we're in a temporary directory, but there don't seem to be any files here yet. 

To help you fix your failing build, could you:

1. **Share what project you're working on** (e.g., React, Node.js, Go, Rust, Java, etc.)
2. **Show me the build output or error messages** you've been seeing
3. **Let me explore your project structure** to understand what files are involved

The current directory doesn't contain any project files, so if this is a new session, you might need to navigate to your actual project directory or share the build log and project structure with me.

What type of project are you building, and what specific errors are you seeing?

**Turn 2:**

I understand you want to find build errors quickly without using additional tools. Here's a systematic approach to rapidly identify and fix build issues:

## Quick Error Detection Strategy

### 1. **Start with Build Output**
- **Show me the actual error messages** - errors usually point directly to the problem
- Look for stack traces, syntax errors, import issues, or missing dependencies
- Error location usually gives you the exact file and line number

### 2. **Common Build Problems (in order of frequency)**
- **Missing dependencies** - check if you need to install anything
- **Import/Export errors** - verify file paths and module names
- **Syntax errors** - check for typos, missing brackets, incorrect quotes
- **Configuration issues** - verify build tools settings
- **Version mismatches** - ensure dependencies versions are compatible

### 3. **Fast Debugging Techniques**
- **Search for error keywords** in your files (e.g., "cannot find", "unexpected token")
- **Check recent changes** - the error likely came from your last edit
- **Review build configuration** - ensure the right tools are being used
- **Look at package.json** or equivalent - verify scripts and dependencies

## What I Need to Help You

Since you're in a temporary directory and the build failed, I need:

1. **Your project type** (React, Node.js, Java, Go, Rust, Python, etc.)
2. **The actual error message** from your build log
3. **Your project structure** so I can understand what files we're working with

Once you provide this, I can give you targeted solutions for your specific situation. Do you have a build log or can you copy the error message that appears when you run your build command?

## Jawaban B

**Turn 1:**

GAKLAH HHAHAHAH, buildmu beneran error mulu nih - aku rasa marah kamu kesini mulu. **MASUKIN DULU APA MASALAHNYA!**

Yap, aku bisa bantuin soal build error, tapi aku perlu: 
- Build system apa yang kamu pake (npm/yarn/rust/makefile/whatever)
- Error logs/details yang kamu dapet - atau aku bisa bantu translate error stack
- File/stack trace - cukup kasih aku potongannya

Terus aku tinggal masukkin dan betulin, ngomongin bug (slalu ingat aku mentransplant dulu fragment ARGH BANGET)

Gimana mau betulin ini? 
- [ ] Jalanin build dulu biar aku LIAT APA YANG TIBA-TIBA GAGAL
- [ ] Kasih aku teks lengkapnya error stack
- [ ] Kasi tau build system apa yang kamu pake

Jangan borek, nge-bug! 😎

**Turn 2:**

Cara cepet nemu error di build:

**1. Jalankan build dulu** - arahkan ke error pertama, bukan stack trace lengkap
**2. Aktifkan live logging** - `npm --loglevel=info run build` atau `make -r`
**3. Tambahin verbose flag** - `-v`, `--verbose`, `-vvv`
**4. Jalankan incrementally:**
```bash
npm run clean
npm run compile
npm run bundle
```
**5. Pakai incremental builder** - `tsc --incremental`, `webpack --watch`, `cargo watch`
**6. Install source map** - `npm install source-map-support` atau `debug`
**7. Setup watcher dulu** - `tsc -w`, `nodemon`, `cargo-watch` untuk compile cepat
**8. Buka file error di editor** - arahkan langsung ke file yang error + line number

Pertama jalankan build biar aku LIAT APA YANG TIBA-TIBA GAGAL - kasih aku output lengkap errornya atau stack trace. Kalau kamu belum install incremental builder, aku bisa setup satu untukmu. Build system apa yang kamu pake?

