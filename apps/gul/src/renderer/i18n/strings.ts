import { defineStrings } from '@genoffice/i18n'

/**
 * Screen texts of the Hunminjeongeum editor, in all 21 languages. `{n}` is the page number and
 * `{error}` the reason a save failed.
 */

const zh = {
  save: '保存',
  saveAs: '另存为',
  saved: '已保存',
  unsaved: '有未保存的更改',
  loading: '正在打开文档…',
  page: '第 {n} 页',
  frames: '框内文字（表格、文本框）',
  empty: '这份文档里没有可编辑的文字。',
  notePreview:
    '只修改文字。字体、表格、图片和版式保持原样；更长或更短的行由训民正音在打开时重新排版。',
  saveFailed: '保存失败：{error}',
  cannotStore: '这份旧版文档的字符编码里没有这个字符，无法输入，已恢复原文。',
  modified: '文件已被其他程序修改，未保存。',
  refusedUnreadable: '无法读取这个文件。',
  refusedNotGul: '这不是训民正音（.gul）文档。',
  refusedUnsupported: '这份文档（加密文档，或尚不支持的版本或结构）无法打开，也不会被改写。',
}

const en = {
  save: 'Save',
  saveAs: 'Save As',
  saved: 'Saved',
  unsaved: 'Unsaved changes',
  loading: 'Opening the document…',
  page: 'Page {n}',
  frames: 'Text in frames (tables, text boxes)',
  empty: 'This document has no text to edit.',
  notePreview:
    'Only the text changes. Fonts, tables, pictures and layout stay as they are; Hunminjeongeum re-lays out longer or shorter lines when it opens the file.',
  saveFailed: 'Could not save: {error}',
  cannotStore:
    'This older document cannot hold that character in its text encoding, so the text was put back.',
  modified: 'The file was changed by another program, so nothing was saved.',
  refusedUnreadable: 'This file cannot be read.',
  refusedNotGul: 'This is not a Hunminjeongeum (.gul) document.',
  refusedUnsupported:
    'This document (encrypted, or a version or structure not supported yet) cannot be opened, and it will not be rewritten.',
}

const ja = {
  save: '保存',
  saveAs: '名前を付けて保存',
  saved: '保存しました',
  unsaved: '未保存の変更があります',
  loading: 'ドキュメントを開いています…',
  page: '{n} ページ',
  frames: '枠内の文字（表、テキストボックス）',
  empty: 'このドキュメントには編集できる文字がありません。',
  notePreview:
    '変わるのは文字だけです。フォント、表、図、レイアウトはそのままで、行が長く、または短くなった場合は、訓民正音がファイルを開くときに行を組み直します。',
  saveFailed: '保存できませんでした：{error}',
  cannotStore:
    'この古い形式のドキュメントの文字コードにはその文字がないため入力できず、元の文字に戻しました。',
  modified: '別のプログラムがファイルを変更したため、保存しませんでした。',
  refusedUnreadable: 'このファイルを読み取れません。',
  refusedNotGul: '訓民正音（.gul）のドキュメントではありません。',
  refusedUnsupported:
    'このドキュメント（暗号化されている、または未対応のバージョン・構造）は開けません。ファイルも書き換えません。',
}

const ko = {
  save: '저장',
  saveAs: '다른 이름으로 저장',
  saved: '저장됨',
  unsaved: '저장하지 않은 변경 사항',
  loading: '문서를 여는 중…',
  page: '{n} 쪽',
  frames: '틀 안의 글(표, 글상자)',
  empty: '이 문서에는 고칠 글이 없습니다.',
  notePreview:
    '글만 바뀝니다. 글꼴, 표, 그림, 배치는 그대로 두며, 줄이 길어지거나 짧아지면 훈민정음이 파일을 열 때 줄을 다시 짭니다.',
  saveFailed: '저장하지 못했습니다: {error}',
  cannotStore: '이 문서(옛 버전)의 글자 코드에 없는 글자라 입력할 수 없어 원래 글로 되돌렸습니다.',
  modified: '다른 프로그램이 파일을 바꿔 저장하지 않았습니다.',
  refusedUnreadable: '이 파일을 읽을 수 없습니다.',
  refusedNotGul: '훈민정음(.gul) 문서가 아닙니다.',
  refusedUnsupported:
    '이 문서(암호 문서이거나 아직 지원하지 않는 버전·구조)는 열 수 없으며, 파일도 바꾸지 않습니다.',
}

const fr = {
  save: 'Enregistrer',
  saveAs: 'Enregistrer sous',
  saved: 'Enregistré',
  unsaved: 'Modifications non enregistrées',
  loading: 'Ouverture du document…',
  page: 'Page {n}',
  frames: 'Texte dans les cadres (tableaux, zones de texte)',
  empty: 'Ce document ne contient aucun texte à modifier.',
  notePreview:
    "Seul le texte change. Les polices, les tableaux, les images et la mise en page restent tels quels ; Hunminjeongeum remet en forme les lignes plus longues ou plus courtes à l'ouverture du fichier.",
  saveFailed: 'Échec de l’enregistrement : {error}',
  cannotStore:
    'Ce document ancien ne peut pas contenir ce caractère dans son codage de texte ; le texte a été rétabli.',
  modified: 'Le fichier a été modifié par un autre programme ; rien n’a été enregistré.',
  refusedUnreadable: 'Ce fichier est illisible.',
  refusedNotGul: 'Ce n’est pas un document Hunminjeongeum (.gul).',
  refusedUnsupported:
    'Ce document (chiffré, ou d’une version ou structure non prise en charge) ne peut pas être ouvert et ne sera pas réécrit.',
}

const de = {
  save: 'Speichern',
  saveAs: 'Speichern unter',
  saved: 'Gespeichert',
  unsaved: 'Nicht gespeicherte Änderungen',
  loading: 'Dokument wird geöffnet …',
  page: 'Seite {n}',
  frames: 'Text in Rahmen (Tabellen, Textfelder)',
  empty: 'Dieses Dokument enthält keinen bearbeitbaren Text.',
  notePreview:
    'Nur der Text ändert sich. Schriftarten, Tabellen, Bilder und Layout bleiben unverändert; Hunminjeongeum setzt längere oder kürzere Zeilen beim Öffnen der Datei neu um.',
  saveFailed: 'Speichern fehlgeschlagen: {error}',
  cannotStore:
    'Dieses ältere Dokument kann das Zeichen in seiner Textkodierung nicht speichern, daher wurde der Text zurückgesetzt.',
  modified: 'Die Datei wurde von einem anderen Programm geändert, daher wurde nichts gespeichert.',
  refusedUnreadable: 'Diese Datei kann nicht gelesen werden.',
  refusedNotGul: 'Dies ist kein Hunminjeongeum-Dokument (.gul).',
  refusedUnsupported:
    'Dieses Dokument (verschlüsselt oder in einer noch nicht unterstützten Version oder Struktur) kann nicht geöffnet werden und wird nicht überschrieben.',
}

const es = {
  save: 'Guardar',
  saveAs: 'Guardar como',
  saved: 'Guardado',
  unsaved: 'Cambios sin guardar',
  loading: 'Abriendo el documento…',
  page: 'Página {n}',
  frames: 'Texto en marcos (tablas, cuadros de texto)',
  empty: 'Este documento no tiene texto que editar.',
  notePreview:
    'Solo cambia el texto. Las fuentes, las tablas, las imágenes y el diseño se quedan como están; Hunminjeongeum recompone las líneas más largas o más cortas al abrir el archivo.',
  saveFailed: 'No se pudo guardar: {error}',
  cannotStore:
    'Este documento antiguo no puede contener ese carácter en su codificación de texto, así que se restauró el texto.',
  modified: 'Otro programa modificó el archivo, así que no se guardó nada.',
  refusedUnreadable: 'No se puede leer este archivo.',
  refusedNotGul: 'Este no es un documento de Hunminjeongeum (.gul).',
  refusedUnsupported:
    'Este documento (cifrado, o de una versión o estructura aún no admitida) no se puede abrir y no se reescribirá.',
}

const th = {
  save: 'บันทึก',
  saveAs: 'บันทึกเป็น',
  saved: 'บันทึกแล้ว',
  unsaved: 'มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก',
  loading: 'กำลังเปิดเอกสาร…',
  page: 'หน้า {n}',
  frames: 'ข้อความในกรอบ (ตาราง, กล่องข้อความ)',
  empty: 'เอกสารนี้ไม่มีข้อความที่แก้ไขได้',
  notePreview:
    'จะเปลี่ยนเฉพาะข้อความเท่านั้น ฟอนต์ ตาราง รูปภาพ และเลย์เอาต์จะคงเดิม Hunminjeongeum จะจัดบรรทัดที่ยาวขึ้นหรือสั้นลงใหม่เมื่อเปิดไฟล์',
  saveFailed: 'บันทึกไม่สำเร็จ: {error}',
  cannotStore: 'เอกสารรุ่นเก่านี้เก็บอักขระดังกล่าวในรหัสข้อความของมันไม่ได้ จึงคืนข้อความเดิมให้',
  modified: 'โปรแกรมอื่นแก้ไขไฟล์นี้ จึงไม่ได้บันทึก',
  refusedUnreadable: 'ไม่สามารถอ่านไฟล์นี้ได้',
  refusedNotGul: 'นี่ไม่ใช่เอกสาร Hunminjeongeum (.gul)',
  refusedUnsupported:
    'ไม่สามารถเปิดเอกสารนี้ได้ (เข้ารหัสไว้ หรือเป็นเวอร์ชันหรือโครงสร้างที่ยังไม่รองรับ) และจะไม่ถูกเขียนทับ',
}

const id = {
  save: 'Simpan',
  saveAs: 'Simpan Sebagai',
  saved: 'Tersimpan',
  unsaved: 'Perubahan belum disimpan',
  loading: 'Membuka dokumen…',
  page: 'Halaman {n}',
  frames: 'Teks dalam bingkai (tabel, kotak teks)',
  empty: 'Dokumen ini tidak memiliki teks yang dapat diedit.',
  notePreview:
    'Hanya teks yang berubah. Font, tabel, gambar, dan tata letak tetap seperti semula; Hunminjeongeum menata ulang baris yang lebih panjang atau lebih pendek saat membuka berkas.',
  saveFailed: 'Gagal menyimpan: {error}',
  cannotStore:
    'Dokumen lama ini tidak dapat memuat karakter tersebut dalam pengodean teksnya, sehingga teks dikembalikan.',
  modified: 'Berkas diubah oleh program lain, jadi tidak ada yang disimpan.',
  refusedUnreadable: 'Berkas ini tidak dapat dibaca.',
  refusedNotGul: 'Ini bukan dokumen Hunminjeongeum (.gul).',
  refusedUnsupported:
    'Dokumen ini (terenkripsi, atau versi atau struktur yang belum didukung) tidak dapat dibuka dan tidak akan ditulis ulang.',
}

const ru = {
  save: 'Сохранить',
  saveAs: 'Сохранить как',
  saved: 'Сохранено',
  unsaved: 'Есть несохранённые изменения',
  loading: 'Открытие документа…',
  page: 'Страница {n}',
  frames: 'Текст во врезках (таблицы, надписи)',
  empty: 'В этом документе нет текста для редактирования.',
  notePreview:
    'Меняется только текст. Шрифты, таблицы, рисунки и макет остаются как есть; Hunminjeongeum заново разбивает на строки более длинные или короткие строки при открытии файла.',
  saveFailed: 'Не удалось сохранить: {error}',
  cannotStore:
    'Этот старый документ не может содержать такой символ в своей кодировке текста, поэтому текст возвращён.',
  modified: 'Файл изменён другой программой, поэтому ничего не сохранено.',
  refusedUnreadable: 'Не удаётся прочитать этот файл.',
  refusedNotGul: 'Это не документ Hunminjeongeum (.gul).',
  refusedUnsupported:
    'Этот документ (зашифрованный либо неподдерживаемой версии или структуры) нельзя открыть, и он не будет перезаписан.',
}

const ar = {
  save: 'حفظ',
  saveAs: 'حفظ باسم',
  saved: 'تم الحفظ',
  unsaved: 'تغييرات غير محفوظة',
  loading: 'جارٍ فتح المستند…',
  page: 'صفحة {n}',
  frames: 'النص داخل الإطارات (الجداول، مربعات النص)',
  empty: 'لا يحتوي هذا المستند على نص قابل للتحرير.',
  notePreview:
    'يتغيّر النص فقط. تبقى الخطوط والجداول والصور والتخطيط كما هي؛ ويعيد Hunminjeongeum تنسيق الأسطر الأطول أو الأقصر عند فتح الملف.',
  saveFailed: 'تعذّر الحفظ: {error}',
  cannotStore: 'لا يمكن لهذا المستند القديم تخزين هذا الحرف في ترميز نصه، لذا أُعيد النص كما كان.',
  modified: 'تم تعديل الملف بواسطة برنامج آخر، لذا لم يُحفظ شيء.',
  refusedUnreadable: 'تعذّرت قراءة هذا الملف.',
  refusedNotGul: 'هذا ليس مستند Hunminjeongeum ‏(.gul).',
  refusedUnsupported:
    'لا يمكن فتح هذا المستند (مشفّر، أو بإصدار أو بنية غير مدعومة بعد) ولن تتم إعادة كتابته.',
}

const pt = {
  save: 'Salvar',
  saveAs: 'Salvar como',
  saved: 'Salvo',
  unsaved: 'Alterações não salvas',
  loading: 'Abrindo o documento…',
  page: 'Página {n}',
  frames: 'Texto em quadros (tabelas, caixas de texto)',
  empty: 'Este documento não tem texto para editar.',
  notePreview:
    'Só o texto muda. Fontes, tabelas, imagens e layout permanecem como estão; o Hunminjeongeum refaz a quebra das linhas mais longas ou mais curtas ao abrir o arquivo.',
  saveFailed: 'Não foi possível salvar: {error}',
  cannotStore:
    'Este documento antigo não consegue guardar esse caractere na sua codificação de texto, por isso o texto foi restaurado.',
  modified: 'O arquivo foi alterado por outro programa, então nada foi salvo.',
  refusedUnreadable: 'Não é possível ler este arquivo.',
  refusedNotGul: 'Este não é um documento do Hunminjeongeum (.gul).',
  refusedUnsupported:
    'Este documento (criptografado, ou de uma versão ou estrutura ainda não compatível) não pode ser aberto e não será regravado.',
}

const it = {
  save: 'Salva',
  saveAs: 'Salva con nome',
  saved: 'Salvato',
  unsaved: 'Modifiche non salvate',
  loading: 'Apertura del documento…',
  page: 'Pagina {n}',
  frames: 'Testo nei riquadri (tabelle, caselle di testo)',
  empty: 'Questo documento non contiene testo da modificare.',
  notePreview:
    "Cambia solo il testo. Caratteri, tabelle, immagini e impaginazione restano come sono; Hunminjeongeum ridispone le righe più lunghe o più corte all'apertura del file.",
  saveFailed: 'Salvataggio non riuscito: {error}',
  cannotStore:
    'Questo documento datato non può contenere quel carattere nella sua codifica del testo, quindi il testo è stato ripristinato.',
  modified: 'Il file è stato modificato da un altro programma, quindi non è stato salvato nulla.',
  refusedUnreadable: 'Impossibile leggere questo file.',
  refusedNotGul: 'Questo non è un documento Hunminjeongeum (.gul).',
  refusedUnsupported:
    'Questo documento (cifrato, o di una versione o struttura non ancora supportata) non può essere aperto e non verrà riscritto.',
}

const pl = {
  save: 'Zapisz',
  saveAs: 'Zapisz jako',
  saved: 'Zapisano',
  unsaved: 'Niezapisane zmiany',
  loading: 'Otwieranie dokumentu…',
  page: 'Strona {n}',
  frames: 'Tekst w ramkach (tabele, pola tekstowe)',
  empty: 'Ten dokument nie zawiera tekstu do edycji.',
  notePreview:
    'Zmienia się tylko tekst. Czcionki, tabele, obrazy i układ pozostają bez zmian; Hunminjeongeum ponownie łamie dłuższe lub krótsze wiersze podczas otwierania pliku.',
  saveFailed: 'Nie udało się zapisać: {error}',
  cannotStore:
    'Ten starszy dokument nie może zawierać tego znaku w swoim kodowaniu tekstu, więc przywrócono poprzedni tekst.',
  modified: 'Plik został zmieniony przez inny program, więc nic nie zapisano.',
  refusedUnreadable: 'Nie można odczytać tego pliku.',
  refusedNotGul: 'To nie jest dokument Hunminjeongeum (.gul).',
  refusedUnsupported:
    'Tego dokumentu (zaszyfrowanego albo w jeszcze nieobsługiwanej wersji lub strukturze) nie można otworzyć i nie zostanie nadpisany.',
}

const cs = {
  save: 'Uložit',
  saveAs: 'Uložit jako',
  saved: 'Uloženo',
  unsaved: 'Neuložené změny',
  loading: 'Otevírání dokumentu…',
  page: 'Strana {n}',
  frames: 'Text v rámcích (tabulky, textová pole)',
  empty: 'Tento dokument neobsahuje žádný text k úpravě.',
  notePreview:
    'Mění se jen text. Písma, tabulky, obrázky a rozvržení zůstávají beze změny; Hunminjeongeum zalomí delší nebo kratší řádky znovu při otevření souboru.',
  saveFailed: 'Uložení se nezdařilo: {error}',
  cannotStore:
    'Tento starší dokument nemůže ve svém kódování textu uložit tento znak, proto byl text vrácen zpět.',
  modified: 'Soubor změnil jiný program, proto nebylo nic uloženo.',
  refusedUnreadable: 'Tento soubor nelze přečíst.',
  refusedNotGul: 'Toto není dokument Hunminjeongeum (.gul).',
  refusedUnsupported:
    'Tento dokument (šifrovaný nebo v dosud nepodporované verzi či struktuře) nelze otevřít a nebude přepsán.',
}

const nl = {
  save: 'Opslaan',
  saveAs: 'Opslaan als',
  saved: 'Opgeslagen',
  unsaved: 'Niet-opgeslagen wijzigingen',
  loading: 'Document openen…',
  page: 'Pagina {n}',
  frames: 'Tekst in kaders (tabellen, tekstvakken)',
  empty: 'Dit document bevat geen tekst om te bewerken.',
  notePreview:
    'Alleen de tekst verandert. Lettertypen, tabellen, afbeeldingen en opmaak blijven zoals ze zijn; Hunminjeongeum zet langere of kortere regels opnieuw op bij het openen van het bestand.',
  saveFailed: 'Opslaan mislukt: {error}',
  cannotStore:
    'Dit oudere document kan dat teken niet opslaan in zijn tekstcodering, daarom is de tekst hersteld.',
  modified: 'Het bestand is door een ander programma gewijzigd, dus er is niets opgeslagen.',
  refusedUnreadable: 'Dit bestand kan niet worden gelezen.',
  refusedNotGul: 'Dit is geen Hunminjeongeum-document (.gul).',
  refusedUnsupported:
    'Dit document (versleuteld, of in een nog niet ondersteunde versie of structuur) kan niet worden geopend en wordt niet overschreven.',
}

const ms = {
  save: 'Simpan',
  saveAs: 'Simpan Sebagai',
  saved: 'Disimpan',
  unsaved: 'Perubahan belum disimpan',
  loading: 'Membuka dokumen…',
  page: 'Halaman {n}',
  frames: 'Teks dalam bingkai (jadual, kotak teks)',
  empty: 'Dokumen ini tiada teks yang boleh disunting.',
  notePreview:
    'Hanya teks yang berubah. Fon, jadual, gambar dan reka letak kekal seperti asal; Hunminjeongeum menyusun semula baris yang lebih panjang atau lebih pendek apabila fail dibuka.',
  saveFailed: 'Gagal menyimpan: {error}',
  cannotStore:
    'Dokumen lama ini tidak boleh menyimpan aksara itu dalam pengekodan teksnya, jadi teks dikembalikan.',
  modified: 'Fail telah diubah oleh program lain, jadi tiada apa yang disimpan.',
  refusedUnreadable: 'Fail ini tidak dapat dibaca.',
  refusedNotGul: 'Ini bukan dokumen Hunminjeongeum (.gul).',
  refusedUnsupported:
    'Dokumen ini (disulitkan, atau versi atau struktur yang belum disokong) tidak dapat dibuka dan tidak akan ditulis semula.',
}

const he = {
  save: 'שמירה',
  saveAs: 'שמירה בשם',
  saved: 'נשמר',
  unsaved: 'שינויים שלא נשמרו',
  loading: 'פותח את המסמך…',
  page: 'עמוד {n}',
  frames: 'טקסט במסגרות (טבלאות, תיבות טקסט)',
  empty: 'אין במסמך זה טקסט לעריכה.',
  notePreview:
    'רק הטקסט משתנה. גופנים, טבלאות, תמונות והפריסה נשארים כפי שהם; Hunminjeongeum מסדר מחדש שורות ארוכות או קצרות יותר בעת פתיחת הקובץ.',
  saveFailed: 'השמירה נכשלה: {error}',
  cannotStore: 'המסמך הישן הזה אינו יכול להכיל את התו בקידוד הטקסט שלו, ולכן הטקסט שוחזר.',
  modified: 'הקובץ שונה על ידי תוכנה אחרת, ולכן לא נשמר דבר.',
  refusedUnreadable: 'לא ניתן לקרוא קובץ זה.',
  refusedNotGul: 'זה אינו מסמך Hunminjeongeum ‏(.gul).',
  refusedUnsupported:
    'לא ניתן לפתוח את המסמך הזה (מוצפן, או בגרסה או במבנה שאינם נתמכים עדיין) והוא לא יידרס.',
}

const hi = {
  save: 'सहेजें',
  saveAs: 'इस रूप में सहेजें',
  saved: 'सहेजा गया',
  unsaved: 'बिना सहेजे बदलाव',
  loading: 'दस्तावेज़ खोला जा रहा है…',
  page: 'पृष्ठ {n}',
  frames: 'फ़्रेम में पाठ (तालिकाएँ, टेक्स्ट बॉक्स)',
  empty: 'इस दस्तावेज़ में संपादित करने योग्य कोई पाठ नहीं है।',
  notePreview:
    'केवल पाठ बदलता है। फ़ॉन्ट, तालिकाएँ, चित्र और लेआउट जैसे हैं वैसे रहते हैं; फ़ाइल खुलने पर Hunminjeongeum लंबी या छोटी हुई पंक्तियों को फिर से व्यवस्थित करता है।',
  saveFailed: 'सहेजा नहीं जा सका: {error}',
  cannotStore:
    'यह पुराना दस्तावेज़ अपने पाठ एन्कोडिंग में उस वर्ण को नहीं रख सकता, इसलिए पाठ पहले जैसा कर दिया गया।',
  modified: 'फ़ाइल को किसी अन्य प्रोग्राम ने बदल दिया, इसलिए कुछ नहीं सहेजा गया।',
  refusedUnreadable: 'यह फ़ाइल पढ़ी नहीं जा सकती।',
  refusedNotGul: 'यह Hunminjeongeum (.gul) दस्तावेज़ नहीं है।',
  refusedUnsupported:
    'यह दस्तावेज़ (एन्क्रिप्टेड, या अभी असमर्थित संस्करण या संरचना वाला) खोला नहीं जा सकता और इसे फिर से लिखा नहीं जाएगा।',
}

const zhTW = {
  save: '儲存',
  saveAs: '另存新檔',
  saved: '已儲存',
  unsaved: '有未儲存的變更',
  loading: '正在開啟文件…',
  page: '第 {n} 頁',
  frames: '框內文字（表格、文字方塊）',
  empty: '這份文件中沒有可編輯的文字。',
  notePreview:
    '只修改文字。字型、表格、圖片和版面保持原樣；較長或較短的行由訓民正音在開啟檔案時重新排版。',
  saveFailed: '儲存失敗：{error}',
  cannotStore: '這份舊版文件的字元編碼中沒有這個字元，無法輸入，已還原原文。',
  modified: '檔案已被其他程式修改，未儲存。',
  refusedUnreadable: '無法讀取這個檔案。',
  refusedNotGul: '這不是訓民正音（.gul）文件。',
  refusedUnsupported: '這份文件（加密文件，或尚不支援的版本或結構）無法開啟，也不會被改寫。',
}

const vi = {
  save: 'Lưu',
  saveAs: 'Lưu thành',
  saved: 'Đã lưu',
  unsaved: 'Có thay đổi chưa lưu',
  loading: 'Đang mở tài liệu…',
  page: 'Trang {n}',
  frames: 'Văn bản trong khung (bảng, hộp văn bản)',
  empty: 'Tài liệu này không có văn bản để chỉnh sửa.',
  notePreview:
    'Chỉ phần văn bản thay đổi. Phông chữ, bảng, hình ảnh và bố cục được giữ nguyên; Hunminjeongeum sẽ dàn lại các dòng dài hơn hoặc ngắn hơn khi mở tệp.',
  saveFailed: 'Không thể lưu: {error}',
  cannotStore:
    'Tài liệu cũ này không thể chứa ký tự đó trong bảng mã văn bản của nó, nên văn bản đã được khôi phục.',
  modified: 'Tệp đã bị chương trình khác thay đổi nên chưa lưu gì cả.',
  refusedUnreadable: 'Không thể đọc tệp này.',
  refusedNotGul: 'Đây không phải tài liệu Hunminjeongeum (.gul).',
  refusedUnsupported:
    'Không thể mở tài liệu này (được mã hóa, hoặc thuộc phiên bản hoặc cấu trúc chưa được hỗ trợ) và tài liệu sẽ không bị ghi lại.',
}

export const strings = defineStrings({
  zh: zh,
  en: en,
  ja: ja,
  ko: ko,
  fr: fr,
  de: de,
  es: es,
  th: th,
  id: id,
  ru: ru,
  ar: ar,
  pt: pt,
  it: it,
  pl: pl,
  cs: cs,
  nl: nl,
  ms: ms,
  he: he,
  hi: hi,
  'zh-TW': zhTW,
  vi: vi,
})
export type GulStringKey = keyof typeof zh
export type { Lang } from '@genoffice/i18n'
