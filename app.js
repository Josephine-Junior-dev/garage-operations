// ======================================================
// SAVE REQUISITION
// ======================================================
if ($("reqForm")) {
  $("reqForm").onsubmit = async e => {
    e.preventDefault();

    ensureReqCategory();

    const expenseType =
      reqCategoryField()?.value || "Materials";

    const notes =
      $("reqnotes")?.value.trim() || "";

    const item =
      $("reqitem")?.value.trim() || "";

    const quantity =
      num($("reqqty")?.value);

    const unitCost =
      num($("requnit")?.value);

    const total =
      quantity * unitCost;

    if (!item) {
      toast(
        "Enter the requisition item or description."
      );
      return;
    }

    if (quantity <= 0) {
      toast("Enter a valid quantity.");
      return;
    }

    if (unitCost < 0) {
      toast("Enter a valid unit cost.");
      return;
    }

    const data = {
      req_no:
        $("reqno")?.value.trim() ||
        nextReqNumber(),

      req_date:
        $("reqdate")?.value ||
        today(),

      requested_by:
        $("reqby")?.value.trim() ||
        "Josephine",

      vehicle_id:
        $("reqvehicle")?.value ||
        null,

      item_description: item,

      expense_type: expenseType,

      quantity,

      unit_cost: unitCost,

      total_amount: total,

      status:
        $("reqstatus")?.value ||
        "Pending",

      notes
    };

    const result = await sb
      .from("requisitions")
      .insert(data);

    if (result.error) {
      toast(
        "Requisition could not be saved: " +
        result.error.message
      );
      return;
    }

    $("reqModal")?.classList.add(
      "hidden"
    );

    await load();

    toast(
      `${expenseType} requisition saved successfully.`
    );
  };
}
