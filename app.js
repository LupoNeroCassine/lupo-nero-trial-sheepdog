document.addEventListener('DOMContentLoaded', () => {

  let currentStep = 1;
  let language = 'it';
  let hasSignature = false;

  let reservationMade = false;
  let reservationCode = '';
  let reservationWaiting = false;
  let reservedClass = '';

  const form = document.getElementById('entryForm');
  const formSteps = [...document.querySelectorAll('.form-step')];
  const stepLabels = [...document.querySelectorAll('.steps li')];

  const nextBtn = document.getElementById('nextBtn');
  const prevBtn = document.getElementById('prevBtn');
  const progress = document.getElementById('progressBar');
  const statusEl = document.getElementById('status');

  const classSelect = form.elements.trialClass;
  const capacityNotice = document.getElementById('capacityNotice');

  const receipt = form.elements.receipt;
  const receiptHelp = document.getElementById('receiptHelp');

  const paymentBox = document.querySelector('.payment-box');
  const receiptLabel = receipt.closest('label');


  /* =========================
     MENU MOBILE
  ========================= */

  const menuBtn = document.getElementById('menuBtn');
  const mainNav = document.getElementById('mainNav');

  if (menuBtn && mainNav) {
    menuBtn.onclick = () => {
      mainNav.classList.toggle('open');
    };
  }


  /* =========================
     BACKEND APPS SCRIPT
  ========================= */

  async function apiCall(action, data) {

    const url = window.LUPO_NERO_CONFIG?.backendUrl;

    if (!url) {
      throw new Error(
        'Backend iscrizioni non configurato.'
      );
    }

    const response = await fetch(url, {
      method: 'POST',
      redirect: 'follow',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify({
        action: action,
        data: data
      })
    });

    if (!response.ok) {
      throw new Error(
        'Errore di comunicazione con la segreteria.'
      );
    }

    const result = await response.json();

    if (result.ok === false) {
      throw new Error(
        result.error || 'Errore nella procedura.'
      );
    }

    return result;
  }


  /* =========================
     LINGUA
  ========================= */

  document.querySelectorAll('.lang').forEach(button => {

    button.onclick = () => {
      setLanguage(button.dataset.lang);
    };

  });


  function setLanguage(lang) {

    language = lang;
    document.documentElement.lang = lang;

    document.querySelectorAll('[data-it]').forEach(el => {

      const value =
        el.getAttribute('data-' + lang);

      if (value !== null) {
        el.innerHTML = value;
      }

    });


    document.querySelectorAll('.lang').forEach(button => {

      button.classList.toggle(
        'active',
        button.dataset.lang === lang
      );

    });


    updateReservationMessage();
    render();
  }


  /* =========================
     PROPRIETARIO / CONDUTTORE
  ========================= */

  const same =
    document.getElementById('sameHandler');

  const handlerSection =
    document.getElementById('handlerSection');


  function syncHandler() {

    const isSame = same.checked;

    handlerSection.style.display =
      isSame ? 'none' : 'block';


    [
      ['ownerFirstName','handlerFirstName'],
      ['ownerLastName','handlerLastName'],
      ['ownerPhone','handlerPhone'],
      ['ownerEmail','handlerEmail']
    ].forEach(([owner, handler]) => {

      form.elements[handler].required =
        !isSame;

      if (isSame) {
        form.elements[handler].value =
          form.elements[owner].value;
      }

    });

  }


  same.onchange = syncHandler;


  [
    'ownerFirstName',
    'ownerLastName',
    'ownerPhone',
    'ownerEmail'
  ].forEach(name => {

    form.elements[name]
      .addEventListener(
        'input',
        syncHandler
      );

  });


  syncHandler();


  /* =========================
     PAGAMENTO
  ========================= */

  receipt.required = false;

  capacityNotice.textContent = '';
  receiptHelp.textContent = '';


  function updateReservationMessage() {

    capacityNotice.className =
      'capacity-notice';


    /* Prima della verifica non mostriamo
       nessun limite e nessun numero. */

    if (!reservationMade) {

      capacityNotice.textContent = '';
      receipt.required = false;

      receiptHelp.textContent = '';

      return;
    }


    /* LISTA D'ATTESA */

    if (reservationWaiting) {

      capacityNotice.classList.add('full');

      capacityNotice.textContent =
        language === 'it'
          ? 'ISCRIZIONE IN LISTA D’ATTESA'
          : 'ENTRY ON WAITING LIST';


      receipt.required = false;


      if (paymentBox) {
        paymentBox.style.display = 'none';
      }


      if (receiptLabel) {
        receiptLabel.style.display = 'none';
      }


      receiptHelp.textContent =
        language === 'it'
          ? 'Non effettuare il bonifico. La segreteria ti contatterà se si libera un posto.'
          : 'Do not make the payment. The Secretariat will contact you if a place becomes available.';

    }

    /* POSTO DISPONIBILE */

    else {

      capacityNotice.classList.add(
        'available'
      );


     capacityNotice.textContent = '';

      receipt.required = true;


      if (paymentBox) {
        paymentBox.style.display = '';
      }


      if (receiptLabel) {
        receiptLabel.style.display = '';
      }


      receiptHelp.textContent =
        language === 'it'
          ? 'Per completare l’iscrizione è obbligatorio allegare la ricevuta del bonifico.'
          : 'To complete the entry, the bank transfer receipt must be uploaded.';

    }

  }


  /* Se il posto è già stato riservato
     impediamo di cambiare classe. */

  classSelect.onchange = () => {

    if (
      reservationMade &&
      classSelect.value !== reservedClass
    ) {

      alert(
        language === 'it'
          ? 'Il posto è già stato riservato per la prova selezionata. Per cambiare classe è necessario iniziare una nuova iscrizione.'
          : 'A place has already been reserved for the selected trial. To change class, please start a new entry.'
      );


      classSelect.value =
        reservedClass;
    }

  };


  /* =========================
     FIRMA PSA
  ========================= */

  const canvas =
    document.getElementById(
      'signatureCanvas'
    );

  const ctx =
    canvas.getContext('2d');

  let drawing = false;


  function point(e) {

    const rect =
      canvas.getBoundingClientRect();

    const source =
      e.touches
        ? e.touches[0]
        : e;


    return {

      x:
        (source.clientX - rect.left)
        * canvas.width
        / rect.width,

      y:
        (source.clientY - rect.top)
        * canvas.height
        / rect.height

    };

  }


  function startDrawing(e) {

    e.preventDefault();

    drawing = true;

    const p = point(e);

    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  }


  function draw(e) {

    if (!drawing) return;

    e.preventDefault();

    const p = point(e);

    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#111';

    ctx.lineTo(p.x, p.y);
    ctx.stroke();

    hasSignature = true;

    document
      .getElementById(
        'signatureError'
      )
      .textContent = '';

  }


  ['mousedown','touchstart']
    .forEach(event => {

      canvas.addEventListener(
        event,
        startDrawing,
        { passive:false }
      );

    });


  ['mousemove','touchmove']
    .forEach(event => {

      canvas.addEventListener(
        event,
        draw,
        { passive:false }
      );

    });


  ['mouseup','mouseleave','touchend']
    .forEach(event => {

      canvas.addEventListener(
        event,
        () => drawing = false
      );

    });


  document
    .getElementById(
      'clearSignature'
    )
    .onclick = () => {

      ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
      );

      hasSignature = false;

    };


  /* =========================
     VALIDAZIONE STEP
  ========================= */

  function validateStep() {

    for (
      const field of
      formSteps[
        currentStep - 1
      ].querySelectorAll(
        '[required]'
      )
    ) {

      if (!field.checkValidity()) {

        field.reportValidity();

        return false;
      }

    }


    if (
      currentStep === 5 &&
      !hasSignature
    ) {

      document
        .getElementById(
          'signatureError'
        )
        .textContent =
          language === 'it'
            ? 'Firma PSA mancante.'
            : 'Missing ASF signature.';

      return false;

    }


    return true;
  }


  /* =========================
     RENDER STEP
  ========================= */

  function render() {

  nextBtn.style.display = '';
    
    formSteps.forEach(step => {

      step.classList.toggle(
        'active',
        Number(step.dataset.step)
          === currentStep
      );

    });


    stepLabels.forEach(
      (label, index) => {

        label.classList.toggle(
          'active',
          index < currentStep
        );

      }
    );


    progress.style.width =
      currentStep * 20 + '%';


    prevBtn.style.visibility =
      currentStep === 1
        ? 'hidden'
        : 'visible';


    nextBtn.textContent =
      currentStep === 5

        ? (
            language === 'it'
              ? 'INVIA ISCRIZIONE'
              : 'SUBMIT ENTRY'
          )

        : (
            language === 'it'
              ? 'AVANTI'
              : 'NEXT'
          );


    if (currentStep === 5) {
      summary();
    }

  }


  /* =========================
     RIEPILOGO
  ========================= */

  function summary() {

    const data =
      new FormData(form);


    const status =
      reservationWaiting

        ? (
            language === 'it'
              ? 'LISTA D’ATTESA'
              : 'WAITING LIST'
          )

        : (
            language === 'it'
              ? 'POSTO RISERVATO'
              : 'PLACE RESERVED'
          );


    document
      .getElementById(
        'summary'
      )
      .innerHTML =

      `<strong>${
        language === 'it'
          ? 'Proprietario'
          : 'Owner'
      }:</strong>
      ${data.get('ownerFirstName')}
      ${data.get('ownerLastName')}

      <br>

      <strong>${
        language === 'it'
          ? 'Conduttore'
          : 'Handler'
      }:</strong>
      ${data.get('handlerFirstName')}
      ${data.get('handlerLastName')}

      <br>

      <strong>${
        language === 'it'
          ? 'Cane'
          : 'Dog'
      }:</strong>
      ${data.get('dogName')}

      <br>

      <strong>${
        language === 'it'
          ? 'Classe'
          : 'Class'
      }:</strong>
      ${data.get('trialClass')}

      <br>

      <strong>${
        language === 'it'
          ? 'Stato'
          : 'Status'
      }:</strong>
      ${status}`;

  }


  /* =========================
     DATI PRENOTAZIONE
  ========================= */

  function reservationPayload() {

    const data =
      new FormData(form);

    const payload = {};


    for (
      const [key,value]
      of data.entries()
    ) {

      if (!(value instanceof File)) {

        payload[key] = value;
      }

    }


    payload.language =
      language;


    return payload;
  }


  /* =========================
     RISERVA POSTO
  ========================= */

  async function reservePlace() {

    form.classList.add('loading');


   statusEl.textContent = '';

    nextBtn.disabled = true;


    try {

      const result =
        await apiCall(
          'reserve',
          reservationPayload()
        );


      reservationMade = true;

      reservationCode =
        result.code;

      reservationWaiting =
        result.waiting;

      reservedClass =
        classSelect.value;


      updateReservationMessage();


      if (reservationWaiting) {

        statusEl.textContent =
          language === 'it'

            ? `Iscrizione inserita in lista d’attesa. Posizione: ${result.waitingPosition}. Non effettuare il bonifico.`

            : `Entry added to the waiting list. Position: ${result.waitingPosition}. Do not make the payment.`;

      }

      else {

        statusEl.textContent =
          language === 'it'

            ? 'Posto riservato per 30 minuti. Procedi con il pagamento e allega la ricevuta.'

            : 'Place reserved for 30 minutes. Proceed with payment and upload the receipt.';

      }
showReservationResult(result);

    }

    catch (error) {

      statusEl.textContent =
        error.message;

      alert(error.message);

    }

    finally {

      form.classList.remove(
        'loading'
      );

      nextBtn.disabled = false;

    }

  }
function showReservationResult(result) {

  let box = document.getElementById('reservationResultBox');

  if (!box) {
    box = document.createElement('div');
    box.id = 'reservationResultBox';

    classSelect
      .closest('label')
      .after(box);
  }

  box.innerHTML = '';

  if (reservationWaiting) {

    box.className = 'reservation-result waiting';

    box.innerHTML = `
      <div class="reservation-icon">!</div>

      <div class="reservation-copy">
        <strong>
          ${language === 'it'
            ? 'ISCRIZIONE IN LISTA D’ATTESA'
            : 'ENTRY ON WAITING LIST'}
        </strong>

        <p>
          ${language === 'it'
            ? `La classe selezionata è completa. Sei stato inserito in lista d’attesa${result.waitingPosition ? ` in posizione ${result.waitingPosition}` : ''}. Non effettuare il bonifico.`
            : `The selected class is full. You have been added to the waiting list${result.waitingPosition ? ` in position ${result.waitingPosition}` : ''}. Do not make the payment.`}
        </p>

        <button type="button" id="continueAfterReservation">
          ${language === 'it'
            ? 'PROSEGUI →'
            : 'CONTINUE →'}
        </button>
      </div>
    `;

  } else {

    box.className = 'reservation-result confirmed';

    box.innerHTML = `
      <div class="reservation-icon">✓</div>

      <div class="reservation-copy">
        <strong>
          ${language === 'it'
            ? 'POSTO RISERVATO'
            : 'PLACE RESERVED'}
        </strong>

        <p>
          ${language === 'it'
            ? 'Il posto è riservato per 30 minuti. Procedi con il pagamento e allega obbligatoriamente la ricevuta del bonifico.'
            : 'Your place is reserved for 30 minutes. Proceed with payment and upload the bank transfer receipt.'}
        </p>

        <button type="button" id="continueAfterReservation">
          ${language === 'it'
            ? 'PROCEDI AI DOCUMENTI →'
            : 'PROCEED TO DOCUMENTS →'}
        </button>
      </div>
    `;
  }


  const continueBtn =
    document.getElementById(
      'continueAfterReservation'
    );


  continueBtn.onclick = () => {
nextBtn.style.display = '';
    currentStep = 4;

    render();

    document
      .getElementById('registration')
      .scrollIntoView({
        behavior:'smooth'
      });

  };


  box.scrollIntoView({
    behavior:'smooth',
    block:'center'
  });
}
  /* =========================
     NAVIGAZIONE
  ========================= */

  prevBtn.onclick = () => {

    if (currentStep > 1) {

      currentStep--;

      render();

    }

  };


  nextBtn.onclick =
    async () => {

      if (!validateStep()) {
        return;
      }


      /* Fine STEP 3:
         prenotazione vera del posto */

      if (
        currentStep === 3 &&
        !reservationMade
      ) {

        await reservePlace();

        return;

      }


      if (currentStep < 5) {

        currentStep++;

        render();


        document
          .getElementById(
            'registration'
          )
          .scrollIntoView({
            behavior:'smooth'
          });


        return;

      }


      await submit();

    };


  /* =========================
     FILE → BASE64
  ========================= */

  async function fileObject(input) {

    const file =
      input.files[0];


    if (!file) {
      return null;
    }


    const data =
      await new Promise(
        (resolve,reject) => {

          const reader =
            new FileReader();


          reader.onload =
            () => resolve(
              String(
                reader.result
              )
              .split(',')[1]
            );


          reader.onerror =
            reject;


          reader.readAsDataURL(
            file
          );

        }
      );


    return {

      name:
        file.name,

      mimeType:
        file.type,

      data:
        data

    };

  }


  /* =========================
     INVIO DEFINITIVO
  ========================= */

  async function submit() {

    if (!reservationCode) {

      alert(
        language === 'it'
          ? 'Prenotazione del posto mancante.'
          : 'Place reservation missing.'
      );

      return;

    }


    form.classList.add(
      'loading'
    );

    nextBtn.disabled = true;


    statusEl.textContent =
      language === 'it'
        ? 'Invio iscrizione in corso...'
        : 'Submitting entry...';


    try {

      const data =
        new FormData(form);

      const payload = {};


      for (
        const [key,value]
        of data.entries()
      ) {

        if (!(value instanceof File)) {

          payload[key] = value;
        }

      }


      [
        'psaAccepted',
        'vaccinationValid',
        'vaccinationInspection',
        'rulesAccepted'
      ].forEach(key => {

        payload[key] =
          form.elements[key].checked;

      });


      payload.language =
        language;


      payload.reservationCode =
        reservationCode;


      payload.signatureData =
        canvas.toDataURL(
          'image/png'
        );


      payload.files = {

        receipt:
          await fileObject(
            receipt
          ),

        pedigree:
          await fileObject(
            form.elements.pedigree
          ),

        recordBook:
          await fileObject(
            form.elements.recordBook
          )

      };


      const result =
        await apiCall(
          'submit',
          payload
        );


     showFinalResult(result);
     
     
    }

    catch (error) {

      statusEl.textContent =
        error.message;

      alert(
        error.message
      );

    }

    finally {

      form.classList.remove(
        'loading'
      );

      nextBtn.disabled = false;

    }

  }
function showFinalResult(result) {

  let box = document.getElementById('finalResultBox');

  if (!box) {
    box = document.createElement('div');
    box.id = 'finalResultBox';
    box.className = 'final-result';
    form.after(box);
  }

  const waiting = result.status === 'LISTA ATTESA';

  box.className = waiting
    ? 'final-result waiting'
    : 'final-result confirmed';

  box.innerHTML = waiting
    ? `
      <div class="final-icon">!</div>

      <div class="final-copy">
        <h3>
          ${language === 'it'
            ? 'RICHIESTA REGISTRATA'
            : 'REQUEST REGISTERED'}
        </h3>

        <p>
          ${language === 'it'
            ? `Codice iscrizione: <strong>${result.code}</strong><br>Sei stato inserito in lista d’attesa. Non effettuare alcun pagamento. La Segreteria ti contatterà se si libera un posto.`
            : `Entry code: <strong>${result.code}</strong><br>You have been added to the waiting list. Do not make any payment. The Secretariat will contact you if a place becomes available.`}
        </p>

        <a href="#home" class="final-home-btn">
          ${language === 'it'
            ? 'TORNA ALLA HOME'
            : 'BACK TO HOME'}
        </a>
      </div>
    `
    : `
      <div class="final-icon">✓</div>

      <div class="final-copy">
        <h3>
          ${language === 'it'
            ? 'ISCRIZIONE COMPLETATA'
            : 'ENTRY COMPLETED'}
        </h3>

        <p>
          ${language === 'it'
            ? `Codice iscrizione: <strong>${result.code}</strong><br>Stato: <strong>${result.status}</strong><br><br>La tua iscrizione è stata registrata correttamente. La Segreteria ha ricevuto i dati, la firma e la ricevuta del bonifico.`
            : `Entry code: <strong>${result.code}</strong><br>Status: <strong>${result.status}</strong><br><br>Your entry has been successfully registered. The Secretariat has received the data, signature and bank transfer receipt.`}
        </p>

        <a href="#home" class="final-home-btn">
          ${language === 'it'
            ? 'TORNA ALLA HOME'
            : 'BACK TO HOME'}
        </a>
      </div>
    `;

  form.style.display = 'none';

  box.scrollIntoView({
    behavior:'smooth',
    block:'center'
  });
}

  setLanguage('it');
  render();

});
