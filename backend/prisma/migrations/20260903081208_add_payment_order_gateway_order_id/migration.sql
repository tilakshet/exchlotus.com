-- AlterTable
ALTER TABLE "payment_orders" ADD COLUMN     "gatewayOrderId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "payment_orders_gatewayOrderId_key" ON "payment_orders"("gatewayOrderId");
