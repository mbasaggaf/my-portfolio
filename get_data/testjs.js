// تعريف العناصر الرئيسية
const getBtn = document.getElementById('get-data');
const spinner = document.getElementById('loading-spinner');

// قائمة الأصناف التي تندرج تحت فئة المستحضرات (حليب، حفائظ.. إلخ) - نسبتها 11%
const cosmeticCategories = [
    'BABY DIAPERS', 
    'BABY MILK', 
    'BABY CEREALS & BISCUITS', 
    'BABY FOOD', 
    'ADULT DIAPERS AND BRIEFS', 
    'FEMININE NAPKINS'
];

function getData() {
    var startDate = document.getElementById('startDate').value;
    var endDate = document.getElementById('endDate').value;
    var password = document.getElementById('password').value;

    // 1. التحقق من المدخلات
    if (!startDate || !endDate || !password) {
        alert("Please fill all fields / الرجاء تعبئة جميع البيانات");
        return; 
    }

    // 2. تشغيل وضع التحميل
    spinner.style.display = "block";
    getBtn.disabled = true;
    getBtn.innerText = "Processing... / جاري المعالجة";

    let jsData = {
        ApiKey: password,
        UseDate: true,
        FromDate: startDate,
        ToDate: endDate
    };

    var myRequest = new XMLHttpRequest();
    myRequest.open("POST", "https://aged-dawn-8401.muhammedbasggaf.workers.dev");
    myRequest.setRequestHeader("accept", "application/json");
    myRequest.setRequestHeader("content-type", "application/json");
    myRequest.setRequestHeader("cache-control", "no-cache");
    
    myRequest.send(JSON.stringify(jsData));

    myRequest.onreadystatechange = function() {
        if (this.readyState === 4) {
            spinner.style.display = "none";
            getBtn.disabled = false;
            getBtn.innerText = "Get DATA";

            if (this.status === 200) {
                try {
                    const responseData = JSON.parse(this.responseText);
                    processAndDisplayData(responseData);
                } catch (e) {
                    console.error("JSON Error:", e);
                    alert("Error processing data.");
                }
            } else {
                console.warn("Server Error:", this.status);
                alert("Connection failed or wrong password.");
            }
        }
    };
}

function processAndDisplayData(itemsData) {
    
    // تعريف المتغيرات لتجميع المبالغ
    let cashAmount = 0;          // كاش أدوية (16%)
    let cosmaticCashAmount = 0;  // كاش حليب وحفائظ (11%)
    let kahlidInsAmount = 0;     // عشم (11%)
    let otherInsAmount = 0;      // تأمين آخر (11%)
    let dataSet = [];

    // الدوران على البيانات
    for (let i = 0; i < itemsData.itemDetails.length; i++) {
        let item = itemsData.itemDetails[i];
        let trx = itemsData.transactions.find(obj => obj.trxNumber == item.trxNumber);

        if (!trx) continue;

        // --- منطق التصنيف والحساب ---
        
        // 1. حالة التأمين
        if (trx.documentType === 'Insurance') {
            let totalItemPrice = item.unitPrice * item.quantityValue;
            if (trx.khalidMedicalCenter) {
                kahlidInsAmount += totalItemPrice; // هذا هو "عشم"
            } else if (trx.customerID != null) {
                otherInsAmount += totalItemPrice;  // هذا التأمين العادي
            }
        } 
        // 2. حالة الكاش
        else if (trx.documentType === 'Cash') {
            // هل الصنف موجود في قائمة الحليب والحفائظ؟
            if (cosmeticCategories.includes(item.category)) {
                cosmaticCashAmount += item.amountValue; // يضاف لخانة الـ 11%
            } else {
                cashAmount += item.amountValue;         // يضاف لخانة الـ 16% (أدوية)
            }
        }

        // تعبئة الجدول
        dataSet.push([
            item.trxNumber,
            trx.trxDate.split("T")[0],
            trx.trxTime.split("T")[1],
            trx.trxType,
            trx.customerID,
            trx.customerName,
            trx.documentType,
            item.itemNumber,
            item.itemDescription,
            item.category,
            item.quantityValue,
            item.unitPrice,
            (item.quantityValue * item.unitPrice).toFixed(2),
            item.amountValue,
            item.vatAmountValue,
            item.netAmountValue
        ]);
    }

    // --- الحسابات النهائية للإيجار (Rental Calculation) ---
    // هنا نطبق النسب التي ذكرتها لي
    let rental_From_Meds = cashAmount * 0.16;             // الأدوية 16%
    let rental_From_Cosmo = cosmaticCashAmount * 0.11;    // الحليب والحفائظ 11%
    let rental_From_Insurance = otherInsAmount * 0.11;    // التأمين 11%
    let rental_From_Asham = kahlidInsAmount * 0.11;       // عشم 11%

    // المجموع الكلي للإيجار المستحق
    let totalRentalValue = rental_From_Meds + rental_From_Cosmo + rental_From_Insurance + rental_From_Asham;

    // --- تحديث الشاشة (UI) ---
    
    // 1. تحديث البطاقات (نعرض إجمالي المبيعات في البطاقات الصغيرة)
    document.getElementById('card-cash-med').innerText = cashAmount.toFixed(2);
    document.getElementById('card-cash-cosmo').innerText = cosmaticCashAmount.toFixed(2);
    document.getElementById('card-insurance').innerText = otherInsAmount.toFixed(2);
    document.getElementById('card-asham').innerText = kahlidInsAmount.toFixed(2);
    
    // البطاقة الكبيرة تعرض صافي الإيجار
    document.getElementById('card-rental').innerText = totalRentalValue.toFixed(2) + " SAR";

    // 2. تحديث الجدول
    if ($.fn.DataTable.isDataTable('#example')) {
        $('#example').DataTable().clear().destroy();
    }
    
    $('#example').DataTable({
        data: dataSet,
        columns: [
            { title: "Inv No." }, { title: "Date" }, { title: "Time" }, { title: "Type" },
            { title: "ID" }, { title: "Customer" }, { title: "Mode" }, { title: "Item" },
            { title: "Desc" }, { title: "Category" }, { title: "QTY" }, { title: "Price" },
            { title: "Gross" }, { title: "Amount" }, { title: "VAT" }, { title: "Net" }
        ],
        dom: 'Bfrtip',
        buttons: ['copy', 'excel', 'print'],
        pageLength: 10,
        responsive: false, // نجعلها false لأننا وضعنا الجدول داخل div responsive
        scrollX: true      // تفعيل السكرول
    });
}

getBtn.addEventListener('click', getData);